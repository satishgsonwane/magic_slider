"use client"

import { useState, useEffect } from "react"
import { Moon, Sun, ChevronFirst, ChevronLast, ChevronLeft, ChevronRight } from "lucide-react"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { useDebouncedCallback } from "use-debounce"
import { processCameraMessages } from "@/lib/message-processor"
import { loadCameraSettings, saveCameraSettings } from "@/lib/data-manager"
import { loadPresetSettings, sendCameraControl, verifyCameraResponse } from '@/lib/camera-control'

// const CSV_URL =
//   "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/camera_settings_60-HZN6d6neOmomocRKsMYsTj2Qy0SiV4.csv"
const CSV_URL = "/data/camera_settings_60.csv"

export default function CameraControl() {
  const [sliderPosition, setSliderPosition] = useState(0)
  const [selectedCameras, setSelectedCameras] = useState<number[]>([])
  const [maxNatsMessages, setMaxNatsMessages] = useState("2")
  const [status, setStatus] = useState("Ready")
  const [isDarkMode, setIsDarkMode] = useState(true)
  const [venueNumber, setVenueNumber] = useState("13")
  const { toast } = useToast()

  useEffect(() => {
    const loadData = async () => {
      const savedSettings = await loadCameraSettings()
      setSliderPosition(savedSettings.sliderPosition || 0)
    }
    loadData()

    // Set initial dark mode
    document.documentElement.classList.add("dark")
    document.documentElement.setAttribute("data-theme", "dark")
  }, [])

  const handleThemeToggle = () => {
    setIsDarkMode(!isDarkMode)
    document.documentElement.classList.toggle("dark")
    document.documentElement.setAttribute("data-theme", isDarkMode ? "light" : "dark")
  }

  const handleSliderChange = useDebouncedCallback(async (value: number) => {
    setSliderPosition(value)
    if (selectedCameras.length === 0) return

    try {
      // Load preset settings for the position
      const settings = await loadPresetSettings(value)
      if (!settings) {
        throw new Error('Failed to load preset settings')
      }

      // Send control messages with status updates
      await sendCameraControl(
        selectedCameras,
        settings,
        Number.parseInt(venueNumber),
        Number.parseInt(maxNatsMessages),
        setStatus
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
    setSelectedCameras((prev) =>
      prev.includes(cameraNumber) ? prev.filter((cam) => cam !== cameraNumber) : [...prev, cameraNumber],
    )
  }

  const handleAllCameras = () => {
    setSelectedCameras(selectedCameras.length === 6 ? [] : [1, 2, 3, 4, 5, 6])
  }

  const handleSeek = (amount: number) => {
    const newPosition = Math.max(0, Math.min(60, sliderPosition + amount))
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
                  selectedCameras.includes(cam) ? "active" : "text-red-100 bg-black/40"
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
                selectedCameras.length === 6 ? "active" : "text-red-100 bg-black/40"
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
              max={60}
              step={1}
              className="flex-1 slider-thumb slider-track slider-track-active"
            />
            <Sun className="h-5 w-5" />
          </div>

          <div className="text-center text-red-100 text-sm">Position: {sliderPosition} / 60</div>

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

          <div className="bg-black/40 p-4 rounded-md text-sm text-center text-red-100 border border-red-900/50">
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
    </main>
  )
}

