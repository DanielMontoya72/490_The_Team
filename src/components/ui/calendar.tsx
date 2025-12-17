import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = {
  mode?: "single"
  selected?: Date
  onSelect?: (date: Date | undefined) => void
  disabled?: (date: Date) => boolean
  initialFocus?: boolean
  captionLayout?: "dropdown" | "label"
  fromDate?: Date
  toDate?: Date
  className?: string
  modifiers?: Record<string, Date[]>
  modifiersStyles?: Record<string, React.CSSProperties>
  modifiersClassNames?: Record<string, string>
}

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
]

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

function Calendar({
  className,
  selected,
  onSelect,
  disabled,
  captionLayout = "dropdown",
  fromDate = new Date(1950, 0, 1),
  toDate = new Date(2100, 11, 31),
  modifiers,
  modifiersStyles,
  modifiersClassNames,
  ...props
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(
    selected ? selected.getMonth() : new Date().getMonth()
  )
  const [currentYear, setCurrentYear] = React.useState(
    selected ? selected.getFullYear() : new Date().getFullYear()
  )

  const daysInMonth = getDaysInMonth(currentYear, currentMonth)
  const firstDayOfWeek = getFirstDayOfWeek(currentYear, currentMonth)

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  const handleDayClick = (day: number) => {
    const date = new Date(currentYear, currentMonth, day)
    if (disabled && disabled(date)) return
    onSelect?.(date)
  }

  const isSelected = (day: number) => {
    if (!selected) return false
    return (
      selected.getDate() === day &&
      selected.getMonth() === currentMonth &&
      selected.getFullYear() === currentYear
    )
  }

  const isToday = (day: number) => {
    const today = new Date()
    return (
      today.getDate() === day &&
      today.getMonth() === currentMonth &&
      today.getFullYear() === currentYear
    )
  }

  const isDisabled = (day: number) => {
    const date = new Date(currentYear, currentMonth, day)
    return disabled ? disabled(date) : false
  }

  const getModifiersForDay = (day: number) => {
    if (!modifiers) return []
    const date = new Date(currentYear, currentMonth, day)
    date.setHours(0, 0, 0, 0)
    
    const matchingModifiers: string[] = []
    Object.entries(modifiers).forEach(([modifierName, dates]) => {
      const hasMatch = dates.some(modDate => {
        const normalizedModDate = new Date(modDate)
        normalizedModDate.setHours(0, 0, 0, 0)
        return normalizedModDate.getTime() === date.getTime()
      })
      if (hasMatch) {
        matchingModifiers.push(modifierName)
      }
    })
    return matchingModifiers
  }

  const getModifierStyle = (modifierNames: string[]) => {
    if (!modifiersStyles || modifierNames.length === 0) return {}
    // Apply the first matching modifier style
    const firstModifier = modifierNames[0]
    return modifiersStyles[firstModifier] || {}
  }

  const getModifierClassName = (modifierNames: string[]) => {
    if (!modifiersClassNames || modifierNames.length === 0) return ""
    // Apply all matching modifier classes
    return modifierNames.map(name => modifiersClassNames[name]).filter(Boolean).join(" ")
  }

  const fromYear = fromDate.getFullYear()
  const toYear = toDate.getFullYear()
  const years = Array.from({ length: toYear - fromYear + 1 }, (_, i) => fromYear + i)

  return (
    <div className={cn("p-3", className)}>
      <div className="space-y-4">
        <div className="flex justify-center pt-1 relative items-center px-10">
          <button
            type="button"
            onClick={handlePrevMonth}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute left-0"
            )}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {captionLayout === "dropdown" ? (
            <div className="flex justify-center gap-1">
              <select
                value={currentMonth}
                onChange={(e) => setCurrentMonth(Number(e.target.value))}
                className="text-sm px-2 py-1 rounded-md border bg-background cursor-pointer"
              >
                {monthNames.map((name, idx) => (
                  <option key={name} value={idx}>
                    {name}
                  </option>
                ))}
              </select>
              <select
                value={currentYear}
                onChange={(e) => setCurrentYear(Number(e.target.value))}
                className="text-sm px-2 py-1 rounded-md border bg-background cursor-pointer"
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="text-sm font-medium">
              {monthNames[currentMonth]} {currentYear}
            </div>
          )}

          <button
            type="button"
            onClick={handleNextMonth}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute right-0"
            )}
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <table className="w-full border-collapse">
          <thead>
            <tr>
              {dayNames.map((day) => (
                <th
                  key={day}
                  className="text-muted-foreground rounded-md w-9 font-normal text-[0.8rem] h-9"
                >
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: Math.ceil((firstDayOfWeek + daysInMonth) / 7) }).map((_, weekIndex) => (
              <tr key={weekIndex}>
                {Array.from({ length: 7 }).map((_, dayIndex) => {
                  const day = weekIndex * 7 + dayIndex - firstDayOfWeek + 1
                  const isValidDay = day > 0 && day <= daysInMonth

                  if (!isValidDay) {
                    return <td key={dayIndex} className="h-9 w-9 text-center text-sm p-0" />
                  }

                  const selected = isSelected(day)
                  const today = isToday(day)
                  const dayDisabled = isDisabled(day)
                  const dayModifiers = getModifiersForDay(day)
                  const modifierStyle = getModifierStyle(dayModifiers)
                  const modifierClassName = getModifierClassName(dayModifiers)
                  const hasModifier = dayModifiers.length > 0

                  return (
                    <td key={dayIndex} className="h-9 w-9 text-center text-sm p-0 relative">
                      <button
                        type="button"
                        onClick={() => handleDayClick(day)}
                        disabled={dayDisabled}
                        style={modifierStyle}
                        className={cn(
                          buttonVariants({ variant: "ghost" }),
                          "h-9 w-9 p-0 font-normal",
                          !hasModifier && selected && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                          !hasModifier && !selected && today && "bg-accent text-accent-foreground",
                          dayDisabled && "text-muted-foreground opacity-50 cursor-not-allowed",
                          modifierClassName
                        )}
                      >
                        {day}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

Calendar.displayName = "Calendar"

export { Calendar }