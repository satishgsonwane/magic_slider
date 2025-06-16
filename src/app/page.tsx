"use client";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/camera-control/theme-toggle";
import { CameraSelection } from "@/components/camera-control/camera-selection";
import { SliderControl } from "@/components/camera-control/slider-control";
import { VenueSelector } from "@/components/camera-control/venue-selector";
import { useCameraControl } from "@/components/camera-control/use-camera-control";
import { Button } from "@/components/ui/button";

export default function CameraControl() {
  const { state, actions } = useCameraControl();

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-black p-4">
      <Card className="max-w-4xl mx-auto red-gradient rounded-lg p-6 relative border-red-900/50 shadow-2xl">
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
            <Button
              onClick={() => actions.handleSliderChange(state.sliderPosition)}
              variant="outline"
              className="px-6 py-2 bg-black/40 text-red-100 hover:bg-red-700/40 hover-red border-red-900/50"
            >
              Reapply Settings
            </Button>
          </div>

          {state.error && (
            <div className="text-red-500 text-center mt-4">
              {state.error.message}
            </div>
          )}
          
          {state.isLoading && (
            <div className="text-red-400 text-center mt-4">
              Loading...
            </div>
          )}
        </div>
      </Card>
    </main>
  );
}
