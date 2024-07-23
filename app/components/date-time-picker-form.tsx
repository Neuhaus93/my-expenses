"use client";

import { TimePickerDemo } from "./time-picker-demo";
import { Label } from "./ui/label";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Calendar } from "~/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { cn } from "~/lib/utils";

export function DateTimePickerForm() {
  const [value, setValue] = useState<any>();

  return (
    <form className="flex items-end gap-4 justify-center">
      <div className="flex flex-col">
        <Label className="text-left">DateTime</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-[280px] justify-start text-left font-normal",
                value && "text-muted-foreground",
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {value ? format(value, "PPP HH:mm:ss") : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={value}
              onSelect={setValue}
              // initialFocus
            />
            <div className="p-3 border-t border-border">
              <TimePickerDemo setDate={setValue} date={value} />
            </div>
          </PopoverContent>
        </Popover>
      </div>
      <Button type="submit">Submit</Button>
    </form>
  );
}
