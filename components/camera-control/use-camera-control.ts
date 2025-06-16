import { useState, useEffect, useRef } from "react"
import { useToast } from "@/components/ui/use-toast"
import { useDebouncedCallback } from "use-debounce"
import { loadCameraSettings, saveCameraSettings } from "@/lib/data-manager"
import { loadPresetSettings, sendCameraControl } from '@/lib/camera-control'
import Papa from "papaparse"
import { CameraSettings } from "@/lib/types"

const CSV_URL = "/data/camera_settings_60.csv"

export interface CameraControlState {
  sliderPosition: number
  selectedCamera: number | null
  maxNatsMessages: string
  status: string
  venueNumber: string
  maxSliderValue: number
}

export function useCameraControl() {
  const [sliderPosition, setSliderPosition] = useState(0)
  const [selectedCamera, setSelectedCamera] = useState<number | null>(null)
  const [maxNatsMessages, setMaxNatsMessages] = useState("2")
  const [status, setStatus] = useState("Ready")
  const [venueNumber, setVenueNumber] = useState("15")
  const [maxSliderValue, setMaxSliderValue] = useState(60)
  const { toast } = useToast()

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
  }, [])

  const handleSliderChange = useDebouncedCallback(async (value: number) => {
    setSliderPosition(value)
    const cameras = selectedCamera === null ? [1, 2, 3, 4, 5, 6] : [selectedCamera]

    try {
      const settings = await loadPresetSettings(value)
      if (!settings) {
        throw new Error('Failed to load preset settings')
      }

      await sendCameraControl(
        cameras as number[],
        settings as CameraSettings,
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

  return {
    state: {
      sliderPosition,
      selectedCamera,
      maxNatsMessages,
      status,
      venueNumber,
      maxSliderValue
    },
    actions: {
      setSliderPosition,
      handleSliderChange,
      handleCameraSelection,
      handleAllCameras,
      handleSeek,
      setMaxNatsMessages,
      setVenueNumber
    }
  }
}
