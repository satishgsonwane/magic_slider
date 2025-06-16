"use client"

import { Input } from "@/components/ui/input"
import { ThemeToggle } from "@/components/camera-control/theme-toggle"
import { CameraSelection } from "@/components/camera-control/camera-selection"
import { SliderControl } from "@/components/camera-control/slider-control"
import { VenueSelector } from "@/components/camera-control/venue-selector"
import { useCameraControl } from "@/components/camera-control/use-camera-control"

export default function CameraControl() {
  const { state, actions } = useCameraControl()

  return (
    <main className="min-h-screen bg-black p-4">
      <div className="max-w-4xl mx-auto red-gradient rounded-lg p-6 relative border border-red-900/50 shadow-2xl">
        <div className="absolute right-4 top-4">
          <ThemeToggle />
        </div>

        <h1 className="text-3xl font-bold mb-8 text-red-500 text-center drop-shadow-lg">
          Magic Slider
        </h1>

        <div className="space-y-6">
          <VenueSelector
            value={state.venueNumber}
            onChange={actions.setVenueNumber}
          />

          <CameraSelection
            selectedCamera={state.selectedCamera}
            onCameraSelect={actions.handleCameraSelection}
            onAllCameras={actions.handleAllCameras}
          />

          <SliderControl
            sliderPosition={state.sliderPosition}
            maxSliderValue={state.maxSliderValue}
            onSliderChange={actions.handleSliderChange}
            onSeek={actions.handleSeek}
          />

          <div className="flex justify-center">
            <button
              onClick={() => actions.handleSliderChange(state.sliderPosition)}
              className="px-6 py-2 rounded-md bg-black/40 text-red-100 hover:bg-red-700/40 hover-red transition-colors border border-red-900/50"
            >
              Reapply Settings
            </button>
          </div>

          <div className="bg-black/40 p-4 rounded-md text-sm text-center text-red-100 border border-red-900/50 whitespace-pre-line">
            {state.status}
          </div>

          <div className="flex items-center justify-center gap-4 text-red-100">
            <span className="text-sm">Max No. of NATS msgs to send:</span>
            <Input
              type="number"
              value={state.maxNatsMessages}
              onChange={(e) => actions.setMaxNatsMessages(e.target.value)}
              className="w-20 text-center bg-black/40 border-red-900/50 text-red-100"
              min="1"
              max="100"
            />
          </div>
        </div>
      </div>
    </main>
  )
}
