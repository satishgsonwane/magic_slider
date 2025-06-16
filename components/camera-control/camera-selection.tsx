interface CameraSelectionProps {
  selectedCamera: number | null;
  onCameraSelect: (camera: number) => void;
  onAllCameras: () => void;
}

export function CameraSelection({
  selectedCamera,
  onCameraSelect,
  onAllCameras
}: CameraSelectionProps) {
  return (
    <>
      <div className="flex flex-wrap gap-2 justify-center">
        {[1, 2, 3, 4, 5, 6].map((cam) => (
          <button
            key={cam}
            onClick={() => onCameraSelect(cam)}
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
          onClick={onAllCameras}
          className={`camera-button px-6 py-2 rounded-md border border-red-900/50 ${
            selectedCamera === null ? "active" : "text-red-100 bg-black/40"
          }`}
        >
          ALL CAMS
        </button>
      </div>
    </>
  )
}
