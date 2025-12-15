import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DatePickerProps {
  date?: Date | null;
  onSelect?: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean | ((date: Date) => boolean);
  className?: string;
  fromYear?: number;
  toYear?: number;
  buttonClassName?: string;
}

export function DatePicker({
  date,
  onSelect,
  placeholder = "Pick a date",
  disabled,
  className,
  fromYear = 1950,
  toYear = new Date().getFullYear() + 10,
  buttonClassName,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  const handleSelect = (selectedDate: Date | undefined) => {
    onSelect?.(selectedDate);
    setOpen(false);
  };

  const isDisabled = typeof disabled === 'boolean' ? disabled : false;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={isDisabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground",
            buttonClassName
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn("w-auto p-0", className)} align="start">
        <Calendar
          mode="single"
          selected={date || undefined}
          onSelect={handleSelect}
          disabled={typeof disabled === 'function' ? disabled : undefined}
          initialFocus
          captionLayout="dropdown"
          fromDate={new Date(fromYear, 0, 1)}
          toDate={new Date(toYear, 11, 31)}
        />
      </PopoverContent>
    </Popover>
  );
}
