import { promises as fs } from "fs";
import { NextResponse } from "next/server";
import path from "path";
import { ApiResponse } from "@/types/api";
import { CameraSettings } from "@/types/camera";

const SETTINGS_FILE = path.join(process.cwd(), "camera_settings.json");

interface Settings {
  sliderPosition: number;
  cameraSettings?: CameraSettings;
}

export async function GET(): Promise<NextResponse<ApiResponse<Settings>>> {
  try {
    const data = await fs.readFile(SETTINGS_FILE, "utf-8");
    const settings = JSON.parse(data) as Settings;
    return NextResponse.json({
      data: settings,
      status: 200
    });
  } catch (error) {
    return NextResponse.json({
      data: { sliderPosition: 1 },
      status: 200
    });
  }
}

export async function POST(request: Request): Promise<NextResponse<ApiResponse<{ success: boolean }>>> {
  try {
    const settings = (await request.json()) as Settings;
    await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2));
    return NextResponse.json({
      data: { success: true },
      status: 200
    });
  } catch (error) {
    return NextResponse.json({
      error: "Failed to save settings",
      status: 500
    });
  }
}
