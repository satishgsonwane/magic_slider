import { Moon, Sun, ChevronFirst, ChevronLast, ChevronLeft, ChevronRight } from "lucide-react"
import { Slider } from "@/components/ui/slider"

interface SliderControlProps {
  sliderPosition: number;
  maxSliderValue: number;
  onSliderChange: (value: number) => void;
  onSeek: (amount: number) => void;
}

export function SliderControl({
  sliderPosition,
  maxSliderValue,
  onSliderChange,
  onSeek
}: SliderControlProps) {
  return (
    <>
      <div className="flex items-center gap-4 px-4 text-red-100">
        <Moon className="h-5 w-5" />
        <Slider
          value={[sliderPosition]}
          onValueChange={([value]) => onSliderChange(value)}
          max={maxSliderValue}
          step={1}
          className="flex-1 slider-thumb slider-track slider-track-active"
        />
        <Sun className="h-5 w-5" />
      </div>

      <div className="text-center text-red-100 text-sm">
        Position: {sliderPosition} / {maxSliderValue}
      </div>

      <div className="flex justify-center gap-2">
        {[
          { Icon: ChevronFirst, value: -5 },
          { Icon: ChevronLeft, value: -1 },
          { Icon: ChevronRight, value: 1 },
          { Icon: ChevronLast, value: 5 },
        ].map(({ Icon, value }, index) => (
          <button
            key={index}
            onClick={() => onSeek(value)}
            className="p-2 rounded-md bg-black/40 text-red-100 hover:bg-red-700/40 hover-red transition-colors border border-red-900/50"
          >
            <Icon className="h-4 w-4" />
          </button>
        ))}
      </div>
    </>
  )
}
