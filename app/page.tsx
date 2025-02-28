"use client"

import { useState, useEffect, useRef } from "react"
import { Moon, Sun, ChevronFirst, ChevronLast, ChevronLeft, ChevronRight } from "lucide-react"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { useDebouncedCallback } from "use-debounce"
import { loadCameraSettings, saveCameraSettings } from "@/lib/data-manager"
import { loadPresetSettings, sendCameraControl, processCameraResponse } from '@/lib/camera-control'
import Papa from "papaparse"
import io from "socket.io-client"
import { CameraSettings } from "@/lib/types"

const CSV_URL = "/data/camera_settings_60.csv"

export default function CameraControl() {
  const [sliderPosition, setSliderPosition] = useState(0)
  const [selectedCamera, setSelectedCamera] = useState<number | null>(null)
  const [maxNatsMessages, setMaxNatsMessages] = useState("2")
  const [status, setStatus] = useState("Ready")
  const [isDarkMode, setIsDarkMode] = useState(true)
  const [venueNumber, setVenueNumber] = useState("15")
  const [maxSliderValue, setMaxSliderValue] = useState(60)
  const { toast } = useToast()
  const sentMessagesRef = useRef<{ [key: string]: any }>({})

  useEffect(() => {
    const loadData = async () => {
      const savedSettings = await loadCameraSettings()
      setSliderPosition(savedSettings.sliderPosition || 0)

      // Load CSV data
      const response = await fetch(CSV_URL)
      const csvText = await response.text()
      const parsedData = Papa.parse(csvText, { header: true })
      setMaxSliderValue(parsedData.data.length - 1)
    }
    loadData()

    // Set initial dark mode
    document.documentElement.classList.add("dark")
    document.documentElement.setAttribute("data-theme", "dark")
  }, [])

  useEffect(() => {
    const socket = io("https://isproxy.ozapi.net", {
      path: "/venue15/engine/socket.io/",
    })

    socket.on("connect", () => {
      const statusElement = document.getElementById("status")
      if (statusElement) {
        statusElement.textContent = "Connection status: Connected"
      }
    })

    socket.on("disconnect", () => {
      const statusElement = document.getElementById("status")
      if (statusElement) {
        statusElement.textContent = "Connection status: Disconnected"
      }
    })

    interface NatsSubscriptionData {
      topic: string;
      message: {
        camera: number;
        preset: number;
        status: string;
        [key: string]: unknown;
      };
    }

    socket.on("nats_subs", (data: NatsSubscriptionData) => {
      console.log("nats_subs --- ", data)
      
      // Process camera responses
      if (data.topic.startsWith('caminq.camera')) {
        processCameraResponse(data.topic, data.data)
      }
      
      // Compare the incoming message with the sent message here
      const sentMessage = sentMessagesRef.current[data.topic]
      if (sentMessage) {
        const keysToCompare = Object.keys(sentMessage)
        const isMatch = keysToCompare.every(key => sentMessage[key] === data.message[key])
        if (isMatch) {
          console.log(`Message for topic ${data.topic} matches the sent message`)
        } else {
          console.log(`Message for topic ${data.topic} does not match the sent message`)
        }
      }
    })

    return () => {
      socket.disconnect()
    }
  }, [])

  const handleThemeToggle = () => {
    setIsDarkMode(!isDarkMode)
    document.documentElement.classList.toggle("dark")
    document.documentElement.setAttribute("data-theme", isDarkMode ? "light" : "dark")
  }

  const handleSliderChange = useDebouncedCallback(async (value: number) => {
    setSliderPosition(value)
    const cameras = selectedCamera === null ? [1, 2, 3, 4, 5, 6] : [selectedCamera]

    try {
      // Load preset settings for the position
      const settings = await loadPresetSettings(value)
      if (!settings) {
        throw new Error('Failed to load preset settings')
      }

      // Send control messages with status updates
      // Use the imported type instead of redefining it
      // import type { CameraSettings } from '@/lib/types'

      interface StatusCallback {
        (status: string): void;
      }

      interface MessageCallback {
        (topic: string, message: { [key: string]: unknown }): void;
      }

            await sendCameraControl(
              cameras as number[],
              settings as CameraSettings,
              Number.parseInt(venueNumber),
              Number.parseInt(maxNatsMessages),
              setStatus as StatusCallback
            )

      await saveCameraSettings({ sliderPosition: value })
    } catch (error) {
      setStatus("Error applying settings")
      toast({
        title: "Error updating camera settings",
        description: "Please try again later",
        variant: "destructive",
      })
    }
  }, 1000)

  const handleCameraSelection = (cameraNumber: number) => {
    setSelectedCamera(cameraNumber === selectedCamera ? null : cameraNumber)
  }

  const handleAllCameras = () => {
    setSelectedCamera(null)
  }

  const handleSeek = (amount: number) => {
    const newPosition = Math.max(0, Math.min(maxSliderValue, sliderPosition + amount))
    setSliderPosition(newPosition)
    handleSliderChange(newPosition)
  }

  return (
    <main className="min-h-screen bg-black p-4">
      <div className="max-w-4xl mx-auto red-gradient rounded-lg p-6 relative border border-red-900/50 shadow-2xl">
        <div className="absolute right-4 top-4 flex items-center gap-2 text-red-100">
          <Sun className="h-4 w-4" />
          <Switch
            checked={isDarkMode}
            onCheckedChange={handleThemeToggle}
            className="bg-red-900/50 data-[state=checked]:bg-red-500"
          />
          <Moon className="h-4 w-4" />
        </div>

        <h1 className="text-3xl font-bold mb-8 text-red-500 text-center drop-shadow-lg">Magic Slider</h1>

        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <Select value={venueNumber} onValueChange={setVenueNumber}>
              <SelectTrigger className="w-[180px] bg-black/40 text-red-100 border-red-900/50 hover:bg-red-700/40 hover-red">
                <SelectValue placeholder="Select Venue" />
              </SelectTrigger>
              <SelectContent className="bg-black text-red-100 border-red-900/50">
                {[...Array(15)].map((_, i) => (
                  <SelectItem key={i} value={(i + 1).toString()} className="hover:bg-red-700/40 hover-red">
                    Venue {i + 1}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap gap-2 justify-center">
            {[1, 2, 3, 4, 5, 6].map((cam) => (
              <button
                key={cam}
                onClick={() => handleCameraSelection(cam)}
                className={`camera-button px-6 py-2 rounded-md border border-red-900/50 ${
                  selectedCamera === cam ? "active" : "text-red-100 bg-black/40"
                }`}
              >
                CAMERA {cam}
              </button>
            ))}
          </div>

          <div className="flex justify-center">
            <button
              onClick={handleAllCameras}
              className={`camera-button px-6 py-2 rounded-md border border-red-900/50 ${
                selectedCamera === null ? "active" : "text-red-100 bg-black/40"
              }`}
            >
              ALL CAMS
            </button>
          </div>

          <div className="flex items-center gap-4 px-4 text-red-100">
            <Moon className="h-5 w-5" />
            <Slider
              value={[sliderPosition]}
              onValueChange={([value]) => handleSliderChange(value)}
              max={maxSliderValue}
              step={1}
              className="flex-1 slider-thumb slider-track slider-track-active"
            />
            <Sun className="h-5 w-5" />
          </div>

          <div className="text-center text-red-100 text-sm">Position: {sliderPosition} / {maxSliderValue}</div>

          <div className="flex justify-center gap-2">
            {[
              { Icon: ChevronFirst, value: -5 },
              { Icon: ChevronLeft, value: -1 },
              { Icon: ChevronRight, value: 1 },
              { Icon: ChevronLast, value: 5 },
            ].map(({ Icon, value }, index) => (
              <button
                key={index}
                onClick={() => handleSeek(value)}
                className="p-2 rounded-md bg-black/40 text-red-100 hover:bg-red-700/40 hover-red transition-colors border border-red-900/50"
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>

          <div className="flex justify-center">
            <button
              onClick={() => handleSliderChange(sliderPosition)}
              className="px-6 py-2 rounded-md bg-black/40 text-red-100 hover:bg-red-700/40 hover-red transition-colors border border-red-900/50"
            >
              Reapply Settings
            </button>
          </div>

          <div className="bg-black/40 p-4 rounded-md text-sm text-center text-red-100 border border-red-900/50 whitespace-pre-line">
            {status}
          </div>

          <div className="flex items-center justify-center gap-4 text-red-100">
            <span className="text-sm">Max No. of NATS msgs to send:</span>
            <Input
              type="number"
              value={maxNatsMessages}
              onChange={(e) => setMaxNatsMessages(e.target.value)}
              className="w-20 text-center bg-black/40 border-red-900/50 text-red-100"
              min="1"
              max="100"
            />
            <button className="px-4 py-2 text-sm rounded-md bg-black/40 hover:bg-red-700/40 hover-red transition-colors border border-red-900/50">
              Update
            </button>
          </div>
        </div>
      </div>
      <div dangerouslySetInnerHTML={{ __html: `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>OZ Engine API Socket test</title>
            <!-- Add Socket.IO client library -->
            <script src="https://cdn.socket.io/4.7.4/socket.io.min.js"></script>
          </head>
          <body>
            <h1>OZ Engine API Socket test</h1>

            <div id="status">Connection status: Disconnected</div>
            <div id="messages"></div>

            <button id="natsEmit">NATS Emit</button>

            <script>
              const socket = io("https://isproxy.ozapi.net", {
                path: "/venue15/engine/socket.io/",
              }); 

              socket.on("connect", () => {
                document.getElementById("status").textContent =
                  "Connection status: Connected";
              });

              socket.on("disconnect", () => {
                document.getElementById("status").textContent =
                  "Connection status: Disconnected";
              });

              socket.on("nats_subs", (data) => {
                console.log(" nats_subs --- ", data);
                
              });
            </script>
          </body>
        </html>
      ` }} />
    </main>
  )
}
