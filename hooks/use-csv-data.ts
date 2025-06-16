import { useState, useEffect } from "react"
import Papa from "papaparse"
import { config } from "@/lib/config"

export interface CsvData {
  data: any[];
  maxValue: number;
}

export function useCsvData() {
  const [data, setData] = useState<CsvData>({ data: [], maxValue: 60 })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const loadCsvData = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(config.csv.url)
        if (!response.ok) {
          throw new Error('Failed to fetch CSV data')
        }
        const csvText = await response.text()
        const parsedData = Papa.parse(csvText, { header: true })
        setData({
          data: parsedData.data,
          maxValue: parsedData.data.length - 1
        })
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load CSV data'))
      } finally {
        setIsLoading(false)
      }
    }

    loadCsvData()
  }, [])

  return { data, isLoading, error }
}
