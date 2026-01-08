
import React from "react";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { parseInputDate, formatDateForInput, formatDateForDisplay } from "@/utils/dateUtils";

interface DueDateSelectorProps {
  dueDate: string;
  setDueDate: (value: string) => void;
}

export const DueDateSelector: React.FC<DueDateSelectorProps> = ({
  dueDate,
  setDueDate,
}) => {
  // Convert string date to Date object for the calendar
  const dateValue = parseInputDate(dueDate);

  // Handle date selection from calendar
  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      const formattedDate = formatDateForInput(date);
      console.log("DueDateSelector: Selected date:", formattedDate);
      setDueDate(formattedDate);
    } else {
      setDueDate("");
    }
  };

  return (
    <div className="space-y-3">
      <Label htmlFor="dueDate" className="text-sm font-medium text-gray-700">
        Due Date
      </Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full h-12 justify-start text-left font-normal apple-select",
              !dueDate && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-3 h-5 w-5 text-gray-500" />
            {dateValue ? (
              <div className="flex flex-col items-start">
                <span className="font-medium text-gray-900">{formatDateForDisplay(dateValue)}</span>
                <span className="text-sm text-gray-500">
                  {format(dateValue, 'EEEE, MMMM d, yyyy')}
                </span>
              </div>
            ) : (
              <span className="text-gray-500">Pick a due date</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 apple-modal" align="start">
          <Calendar
            mode="single"
            selected={dateValue}
            onSelect={handleDateSelect}
            initialFocus
            className="p-4 pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
      
      {/* Selected date preview */}
      {dateValue && (
        <div className="mt-3 p-3 bg-blue-50 rounded-xl border border-blue-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <CalendarIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div className="font-medium text-gray-900">Due Date Set</div>
              <div className="text-sm text-gray-600">{formatDateForDisplay(dateValue)}</div>
              <div className="text-xs text-gray-500">
                {format(dateValue, 'EEEE, MMMM d, yyyy')}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
