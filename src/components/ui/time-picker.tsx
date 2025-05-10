
import * as React from "react";
import { Clock } from "lucide-react";
import { Label } from "./label";
import { Button } from "./button";
import { ScrollArea } from "./scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./popover";
import { cn } from "@/lib/utils";

interface TimePickerProps {
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  label?: string;
  placeholder?: string;
}

export function TimePicker({
  value,
  onChange,
  disabled,
  className,
  label,
  placeholder = "Select time"
}: TimePickerProps) {
  // Create an array of times from 00:00 to 23:30 in 30-minute increments
  const timeOptions = React.useMemo(() => {
    const times = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const formattedHour = hour.toString().padStart(2, "0");
        const formattedMinute = minute.toString().padStart(2, "0");
        times.push(`${formattedHour}:${formattedMinute}`);
      }
    }
    return times;
  }, []);

  const formattedValue = value || "";

  return (
    <div className={className}>
      {label && <Label className="mb-2">{label}</Label>}
      <Popover>
        <PopoverTrigger asChild disabled={disabled}>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !value && "text-muted-foreground"
            )}
          >
            <Clock className="mr-2 h-4 w-4" />
            {formattedValue || placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <ScrollArea className="h-[300px] p-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {timeOptions.map((time) => (
                <Button
                  key={time}
                  variant={time === formattedValue ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "justify-center",
                    time === formattedValue && "bg-primary text-primary-foreground"
                  )}
                  onClick={() => {
                    onChange(time);
                  }}
                >
                  {time}
                </Button>
              ))}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>
  );
}
