import Papa from "papaparse"

interface CameraSetting {
  "Slider Position": string
  iris: string
  exposuregain: string
  shutterspeed: string
  brightness: string
}

export async function analyzeCsvFile(url: string): Promise<{ settings: CameraSetting[] }> {
  const response = await fetch(url)
  const csvText = await response.text()

  return new Promise((resolve, reject) => {
    Papa.parse(csvText, {
      header: true,
      complete: (results) => {
        const settings = results.data as CameraSetting[]
        resolve({ settings })
      },
      error: (error) => {
        reject(error)
      },
    })
  })
}

