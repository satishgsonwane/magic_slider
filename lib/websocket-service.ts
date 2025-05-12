import { processCameraResponse } from './camera-control';

type MessageHandler = (topic: string, data: any) => void;
type StatusHandler = (status: string) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private messageHandlers: MessageHandler[] = [];
  private statusHandler: StatusHandler | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.connect = this.connect.bind(this);
    this.handleMessage = this.handleMessage.bind(this);
    this.handleClose = this.handleClose.bind(this);
    this.handleError = this.handleError.bind(this);
  }

  public connect(statusHandler?: StatusHandler): void {
    if (statusHandler) {
      this.statusHandler = statusHandler;
    }

    const wsUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:12553';
    
    try {
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('WebSocket connection established');
        this.reconnectAttempts = 0;
        if (this.statusHandler) {
          this.statusHandler('WebSocket connected');
        }
      };
      
      this.ws.onmessage = this.handleMessage;
      this.ws.onclose = this.handleClose;
      this.ws.onerror = this.handleError;
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.attemptReconnect();
    }
  }

  public addMessageHandler(handler: MessageHandler): void {
    this.messageHandlers.push(handler);
  }

  public removeMessageHandler(handler: MessageHandler): void {
    this.messageHandlers = this.messageHandlers.filter(h => h !== handler);
  }

  public disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  private handleMessage(event: MessageEvent): void {
    console.log('Raw WebSocket message received:', event.data);
    
    let data;
    try {
      data = JSON.parse(event.data);
      console.log('Parsed WebSocket message:', data);
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
      return;
    }

    if (!data) {
      console.warn('Received empty or invalid message');
      return;
    }

    // Process camera responses
    if (data.topic?.startsWith('caminq.camera')) {
      processCameraResponse(data.topic, data.payload);
    }

    // Notify all registered handlers
    this.messageHandlers.forEach(handler => {
      try {
        handler(data.topic, data.payload);
      } catch (error) {
        console.error('Error in message handler:', error);
      }
    });
  }

  private handleClose(event: CloseEvent): void {
    console.log('WebSocket connection closed:', event);
    if (this.statusHandler) {
      this.statusHandler('WebSocket disconnected');
    }
    this.attemptReconnect();
  }

  private handleError(event: Event): void {
    console.error('WebSocket error:', event);
    if (this.statusHandler) {
      this.statusHandler('WebSocket error');
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnect attempts reached');
      if (this.statusHandler) {
        this.statusHandler('Failed to connect after multiple attempts');
      }
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
    if (this.statusHandler) {
      this.statusHandler(`Reconnecting in ${delay/1000}s (attempt ${this.reconnectAttempts})`);
    }
    
    this.reconnectTimeout = setTimeout(this.connect, delay);
  }
}

// Create a singleton instance
export const websocketService = new WebSocketService(); 