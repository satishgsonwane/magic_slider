import { promises as fs } from 'fs'
import { NextResponse } from 'next/server'
import path from 'path'

export async function GET() {
  try {
    // First try to read from local file
    const csvPath = path.join(process.cwd(), 'public', 'data', 'camera_settings_60.csv')
    console.log('Attempting to read CSV from:', csvPath)
    
    let csvData
    try {
      csvData = await fs.readFile(csvPath, 'utf-8')
      // console.log('Successfully loaded CSV from local file')
    } catch (error) {
      console.log('Local file not found, falling back to environment variable URL')
      // Fallback to URL from environment variable
      const csvUrl = process.env.CAMERA_SETTINGS_CSV_URL
      if (!csvUrl) {
        throw new Error('CSV URL not configured')
      }
      const response = await fetch(csvUrl)
      csvData = await response.text()
    }

    // Validate CSV structure
    const firstLine = csvData.split('\n')[0]
    console.log('CSV headers:', firstLine)
    
    if (!firstLine.includes('position') || 
        !firstLine.includes('iris') || 
        !firstLine.includes('exposuregain') || 
        !firstLine.includes('shutterspeed') || 
        !firstLine.includes('brightness')) {
      console.error('Invalid CSV structure')
      throw new Error('Invalid CSV structure')
    }

    return new NextResponse(csvData, {
      headers: {
        'Content-Type': 'text/csv'
      }
    })
  } catch (error) {
    console.error('Error in camera-settings API:', error)
    return NextResponse.json({ error: 'Failed to fetch camera settings' }, { status: 500 })
  }
} 