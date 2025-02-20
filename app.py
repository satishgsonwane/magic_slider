from flask import Flask, request, jsonify, render_template
from flask_socketio import SocketIO
import asyncio
import threading
import pandas as pd
import os
import json
import time
import signal
import sys
from nats.aio.client import Client as NATS
import logging
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
class Config:
    NATS_SERVER = os.getenv('NATS_SERVER', 'nats://localhost:4222')
    PORT = int(os.getenv('PORT', 12555))
    MAX_MESSAGES = int(os.getenv('MAX_MESSAGES', 5))
    INQUIRY_SLEEP = float(os.getenv('INQUIRY_SLEEP', 0.150))
    CSV_PATH = os.getenv('CSV_PATH', 'colour_settings_csvs/camera_settings_60.csv')

# Create Flask app
app = Flask(__name__,
    template_folder='templates',    # Changed from 'frontend/templates'
    static_folder='static'         # Changed from 'frontend/static'
)
socketio = SocketIO(app, cors_allowed_origins="*")

# Configure logging
class NoWarningsFilter(logging.Filter):
    def filter(self, record):
        return record.levelno != logging.WARNING

log = logging.getLogger('werkzeug')
log.setLevel(logging.INFO)
log.addFilter(NoWarningsFilter())

# Load camera settings
try:
    camera_settings = pd.read_csv(Config.CSV_PATH)
    max_slider_value = len(camera_settings['Slider Position'].unique()) - 1
except Exception as e:
    print(f"Error loading camera settings: {e}")
    camera_settings = None
    max_slider_value = 10  # Default value

# NATS setup
nats_client = NATS()
event_loop = None
shutdown_event = threading.Event()
last_sent_messages = {}

# Signal handler for graceful shutdown
def signal_handler(signum, frame):
    print("\nShutdown signal received. Cleaning up...")
    shutdown_event.set()
    
    # Close NATS connection if it exists
    if nats_client and nats_client.is_connected:
        async def close_nats():
            await nats_client.close()
        if event_loop:
            event_loop.create_task(close_nats())
    
    # Stop the Flask-SocketIO server
    if socketio:
        socketio.stop()
    
    print("Cleanup complete. Exiting...")
    sys.exit(0)

# Register signal handlers
signal.signal(signal.SIGINT, signal_handler)  # Ctrl+C
signal.signal(signal.SIGTERM, signal_handler) # Termination signal

class CameraController:
    def __init__(self, settings):
        self.camera_settings = settings
        self.last_sent_messages = {}

    def get_camera_settings(self, slider_value):
        print(f"Getting camera settings for slider value: {slider_value}")
        try:
            settings = self.camera_settings.iloc[int(slider_value)]
            return {
                "changeexposuremode": "1",
                "exposuremode": "manual",
                "iris": int(settings["iris"]),
                "exposuregain": int(settings["exposuregain"]),
                "shutterspeed": int(settings["shutterspeed"]),
                "brightness": int(settings["brightness"])
            }
        except Exception as e:
            print(f"Error getting camera settings: {e}")
            return None

camera_controller = CameraController(camera_settings)

async def publish_status_to_ui(camera_num, status_message, additional_data=None):
    """Send the status message to the UI via WebSocket."""
    try:
        status_data = {
            "camera": camera_num,
            "status": status_message,
            "timestamp": time.time()
        }
        
        # Add any additional data to the status message
        if additional_data:
            status_data.update(additional_data)
        
        socketio.emit("status_update", status_data)
        print(f"Emitted status update for camera {camera_num}: {status_message}")
    except Exception as e:
        print(f"Error emitting status update: {e}")

async def publish_batch_messages(topic, message, max_retries=None):
    """
    Publishes a message and retries if settings aren't applied correctly.
    max_retries: Maximum number of retry attempts (from NATS message count setting)
    """
    try:
        max_retries = max_retries if max_retries is not None else Config.MAX_MESSAGES
        retry_count = 0
        settings_applied = False
        camera_num = topic.split('.')[-1].replace('camera', '')
        
        # Send initial status to disable reapply button during retries
        if "colour-control" in topic:
            await publish_status_to_ui(
                camera_num,
                "Sending settings...",
                {
                    "retries_complete": False,
                    "settings_applied": False
                }
            )
        
        while retry_count < max_retries and not settings_applied:
            await nats_client.publish(topic, json.dumps(message).encode("utf-8"))
            print(f"Attempt {retry_count + 1}/{max_retries} for camera {camera_num}")
            
            if "colour-control" in topic:
                inquiry_topic = f"ptzcontrol.camera{camera_num}"
                await nats_client.publish(
                    inquiry_topic, 
                    json.dumps({"inqcam": camera_num}).encode("utf-8")
                )
                
                await asyncio.sleep(0.5)
                
                last_sent = last_sent_messages.get(str(camera_num))
                if last_sent and last_sent.get('last_status') == 'success':
                    settings_applied = True
                    print(f"✓ Settings confirmed for camera {camera_num}")
                    break
            else:
                break
            
            retry_count += 1
            if not settings_applied:
                print(f"✗ Settings not confirmed for camera {camera_num}")
                # Send status update without enabling reapply button
                if "colour-control" in topic:
                    await publish_status_to_ui(
                        camera_num,
                        f"Settings not confirmed (Attempt {retry_count}/{max_retries})",
                        {
                            "retries_complete": False,
                            "settings_applied": False
                        }
                    )
                await asyncio.sleep(0.1)
        
        # After all retries, send final status to enable reapply button if needed
        if "colour-control" in topic:
            final_status = "Settings applied successfully" if settings_applied else "Settings mismatch detected"
            await publish_status_to_ui(
                camera_num,
                final_status,
                {
                    "retries_complete": True,
                    "settings_applied": settings_applied
                }
            )
            
        if not settings_applied and "colour-control" in topic:
            print(f"! Failed to apply settings to camera {camera_num} after {max_retries} attempts")
            
    except Exception as e:
        print(f"Error in publish_batch_messages: {e}")

async def handle_camera_inquiry(msg):
    try:
        received_data = json.loads(msg.data.decode())
        camera_num = msg.subject.split('.')[-1].replace('camera', '')
        
        last_sent = last_sent_messages.get(str(camera_num))
        if not last_sent:
            return

        comparison_map = {
            "ExposureMode": "exposuremode",
            "ExposureIris": "iris",
            "ExposureGain": "exposuregain",
            "ExposureExposureTime": "shutterspeed",
            "DigitalBrightLevel": "brightness"
        }

        mismatches = {}
        for received_key, sent_key in comparison_map.items():
            if sent_key in last_sent:
                sent_value = str(last_sent[sent_key]).lower()
                received_value = str(received_data.get(received_key, '')).lower()
                if sent_value != received_value:
                    mismatches[sent_key] = {
                        'sent': sent_value,
                        'received': received_value
                    }

        # Update the last_sent_messages with the status
        last_sent_messages[str(camera_num)]['last_status'] = 'success' if not mismatches else 'mismatch'

        result_topic = f"cam_setting.camera{camera_num}"
        result_message = {
            "timestamp": time.time(),
            "camera": camera_num,
            "status": "All settings done" if not mismatches else None,
            "mismatches": mismatches if mismatches else None
        }

        await nats_client.publish(
            result_topic,
            json.dumps(result_message).encode('utf-8')
        )

        # Don't send UI updates from here - let publish_batch_messages handle all UI updates
        # This prevents premature enabling of the reapply button

    except Exception as e:
        print(f"Error handling camera inquiry: {e}")

async def setup_nats():
    try:
        await nats_client.connect(servers=[Config.NATS_SERVER])
        print("Connected to NATS server successfully")
        
        for camera_num in range(1, 7):
            topic = f"caminq.camera{camera_num}"
            await nats_client.subscribe(topic, cb=handle_camera_inquiry)
            print(f"✅ Subscribed to {topic}")
    except Exception as e:
        print(f"Failed to setup NATS: {e}")
        raise

def start_nats_loop():
    global event_loop
    try:
        event_loop = asyncio.new_event_loop()
        asyncio.set_event_loop(event_loop)
        event_loop.run_until_complete(setup_nats())
        
        # Run event loop with shutdown check
        while not shutdown_event.is_set():
            event_loop.run_until_complete(asyncio.sleep(0.1))
            
        # Clean shutdown of event loop
        event_loop.stop()
        event_loop.close()
    except Exception as e:
        print(f"Error in NATS loop: {e}")

@app.route('/')
def index():
    return render_template('index.html', max_slider_value=max_slider_value)

@app.route('/slider_value', methods=['POST'])
def handle_slider():
    try:
        data = request.get_json()
        slider_value = data.get("slider_value")
        camera_nums = data.get("camera_num")
        
        # Convert single camera number to list for consistent handling
        if not isinstance(camera_nums, list):
            camera_nums = [camera_nums]

        responses = []
        for camera_num in camera_nums:
            camera_num = str(camera_num)
            colour_topic = f"colour-control.camera{camera_num}"
            
            settings = camera_controller.get_camera_settings(slider_value)
            if not settings:
                return jsonify({"status": "failed", "error": "Could not get camera settings"}), 500

            # Initialize the settings with status
            settings['last_status'] = 'pending'
            last_sent_messages[camera_num] = settings

            # Log the message being sent
            print(f"Sending message to API for camera {camera_num}: {settings}")

            if nats_client.is_connected:
                # Create and store the coroutine for each camera
                asyncio.run_coroutine_threadsafe(
                    publish_batch_messages(
                        colour_topic, 
                        settings,
                        Config.MAX_MESSAGES
                    ),
                    event_loop
                )
                
                responses.append({
                    "camera": camera_num,
                    "status": "success",
                    "message_sent": settings
                })
            else:
                return jsonify({"status": "failed", "error": "NATS not connected"}), 500

        return jsonify({"status": "success", "responses": responses})

    except Exception as e:
        print(f"Error handling slider: {e}")
        return jsonify({"status": "failed", "error": str(e)}), 500

@app.route('/update_nats_count', methods=['POST'])
def update_nats_count():
    try:
        data = request.get_json()
        msg_count = data.get("msg_count")
        
        if msg_count is None or msg_count < 1 or msg_count > 20:
            return jsonify({
                "status": "failed", 
                "error": "Invalid retry count. Must be between 1 and 20"
            }), 400
            
        Config.MAX_MESSAGES = int(msg_count)
        print(f"Updated maximum retry attempts to {msg_count}")
        return jsonify({
            "status": "success",
            "message": f"Maximum retry attempts set to {msg_count}"
        })
    except Exception as e:
        return jsonify({"status": "failed", "error": str(e)}), 500

def start_app():
    try:
        # Start NATS in a separate thread
        nats_thread = threading.Thread(target=start_nats_loop, daemon=True)
        nats_thread.start()
        
        # Start Flask-SocketIO with graceful shutdown support
        socketio.run(app, 
            host='0.0.0.0', 
            port=Config.PORT, 
            debug=False, 
            use_reloader=False,
            log_output=False,
            allow_unsafe_werkzeug=True  # Added for better signal handling
        )
    except Exception as e:
        print(f"Error starting app: {e}")
    finally:
        # Ensure cleanup happens
        if not shutdown_event.is_set():
            signal_handler(signal.SIGINT, None)

if __name__ == '__main__':
    try:
        start_app()
    except KeyboardInterrupt:
        print("\nKeyboard interrupt received")
        signal_handler(signal.SIGINT, None)