import { promises as fs } from "fs"
import { NextResponse } from "next/server"

const SETTINGS_FILE = "camera_settings.json"

export async function GET() {
  try {
    const data = await fs.readFile(SETTINGS_FILE, "utf-8")
    return NextResponse.json(JSON.parse(data))
  } catch (error) {
    return NextResponse.json({ sliderPosition: 1 })
  }
}

export async function POST(request: Request) {
  try {
    const settings = await request.json()
    await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings))
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to save settings" }, { status: 500 })
  }
} 