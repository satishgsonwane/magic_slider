import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface VenueSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export function VenueSelector({ value, onChange }: VenueSelectorProps) {
  return (
    <div className="flex justify-between items-center">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-[180px] bg-black/40 text-red-100 border-red-900/50 hover:bg-red-700/40 hover-red">
          <SelectValue placeholder="Select Venue" />
        </SelectTrigger>
        <SelectContent className="bg-black text-red-100 border-red-900/50">
          {[...Array(15)].map((_, i) => (
            <SelectItem key={i} value={(i + 1).toString()} className="hover:bg-red-700/40 hover-red">
              Venue {i + 1}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
