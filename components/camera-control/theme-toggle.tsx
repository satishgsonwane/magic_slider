import { useState, useEffect } from "react"
import { Moon, Sun } from "lucide-react"
import { Switch } from "@/components/ui/switch"

export function ThemeToggle() {
  const [isDarkMode, setIsDarkMode] = useState(true)

  useEffect(() => {
    document.documentElement.classList.add("dark")
    document.documentElement.setAttribute("data-theme", "dark")
  }, [])

  const handleThemeToggle = () => {
    setIsDarkMode(!isDarkMode)
    document.documentElement.classList.toggle("dark")
    document.documentElement.setAttribute("data-theme", isDarkMode ? "light" : "dark")
  }

  return (
    <div className="flex items-center gap-2 text-red-100">
      <Sun className="h-4 w-4" />
      <Switch
        checked={isDarkMode}
        onCheckedChange={handleThemeToggle}
        className="bg-red-900/50 data-[state=checked]:bg-red-500"
      />
      <Moon className="h-4 w-4" />
    </div>
  )
}
