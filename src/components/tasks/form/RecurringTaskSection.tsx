
import React, { useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, AlertCircle } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { addMonths, isBefore } from "date-fns";
import { parseInputDate, formatDateForInput, formatDateForDisplay } from "@/utils/dateUtils";

interface RecurringTaskSectionProps {
  isRecurring: boolean;
  setIsRecurring: (value: boolean) => void;
  recurringFrequency: string;
  setRecurringFrequency: (value: string) => void;
  startDate: string;
  setStartDate: (value: string) => void;
  endDate: string;
  setEndDate: (value: string) => void;
}

export const RecurringTaskSection: React.FC<RecurringTaskSectionProps> = ({
  isRecurring,
  setIsRecurring,
  recurringFrequency,
  setRecurringFrequency,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
}) => {
  // Convert string dates to Date objects for the calendar
  const startDateValue = parseInputDate(startDate);
  const endDateValue = parseInputDate(endDate);
  
  // Calculate maximum allowed end date (6 months from start date)
  const maxEndDate = startDateValue ? addMonths(startDateValue, 6) : undefined;
  
  // Check if end date is valid (within 6 months from start date)
  const isEndDateValid = !endDateValue || !startDateValue || 
    (isBefore(endDateValue, addMonths(startDateValue, 6)) && 
     isBefore(startDateValue, endDateValue));

  // When recurring is turned off, clear the dates
  useEffect(() => {
    if (!isRecurring) {
      setStartDate("");
      setEndDate("");
    }
  }, [isRecurring, setStartDate, setEndDate]);

  // When start date changes, adjust end date if needed
  useEffect(() => {
    if (startDateValue && endDateValue) {
      // If end date is more than 6 months after start date, reset it
      if (!isBefore(endDateValue, addMonths(startDateValue, 6))) {
        console.log("RecurringTaskSection: End date too far from start date, resetting");
        setEndDate("");
      }
      // If end date is before start date, reset it
      else if (isBefore(endDateValue, startDateValue)) {
        console.log("RecurringTaskSection: End date before start date, resetting");
        setEndDate("");
      }
    }
  }, [startDate, endDateValue, startDateValue, setEndDate]);

  // Handle date selection from calendar
  const handleDateSelect = (setter: (value: string) => void) => (date: Date | undefined) => {
    if (date) {
      const formattedDate = formatDateForInput(date);
      console.log("RecurringTaskSection: Setting date:", formattedDate);
      setter(formattedDate);
    } else {
      setter("");
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Label htmlFor="isRecurring" className="text-sm font-medium">
            Recurring Task
          </Label>
          <p className="text-xs text-muted-foreground">
            Backend automation will generate new instances when previous ones are completed
          </p>
        </div>
        <Switch
          id="isRecurring"
          checked={isRecurring}
          onCheckedChange={setIsRecurring}
        />
      </div>

      {isRecurring && (
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="recurringFrequency" className="text-sm font-medium">
              Frequency <span className="text-destructive">*</span>
            </Label>
            <Select
              value={recurringFrequency}
              onValueChange={setRecurringFrequency}
            >
              <SelectTrigger id="recurringFrequency" className="w-full">
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="bi-weekly">Bi-weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="annually">Annually</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="startDate" className="text-sm font-medium">
              Recurrence Start Date <span className="text-destructive">*</span>
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="startDate"
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDateValue ? formatDateForDisplay(startDateValue) : <span>Pick a start date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDateValue}
                  onSelect={handleDateSelect(setStartDate)}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="endDate" className="text-sm font-medium">
                Recurrence End Date <span className="text-destructive">*</span>
              </Label>
              {startDateValue && (
                <span className="text-xs text-muted-foreground">
                  Max: {maxEndDate ? formatDateForDisplay(maxEndDate) : ""}
                </span>
              )}
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="endDate"
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !endDate && "text-muted-foreground",
                    !isEndDateValid && "border-destructive"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDateValue ? formatDateForDisplay(endDateValue) : <span>Pick an end date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDateValue}
                  onSelect={handleDateSelect(setEndDate)}
                  disabled={(date) => {
                    // Disable dates before start date or more than 6 months after start date
                    if (!startDateValue) return false;
                    return date < startDateValue || date > addMonths(startDateValue, 6);
                  }}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            {!isEndDateValid && endDateValue && (
              <div className="flex items-center text-destructive text-xs mt-1">
                <AlertCircle className="h-3 w-3 mr-1" />
                End date must be after start date and within 6 months
              </div>
            )}
          </div>
          
          <div className="text-xs text-muted-foreground bg-blue-50 p-3 rounded border-l-4 border-blue-400">
            <strong>Note:</strong> This creates a parent recurring task. New instances will be automatically 
            generated by the backend system when the previous instance is completed.
          </div>
        </div>
      )}
    </div>
  );
};
