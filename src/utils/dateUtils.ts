
import { format, parse, isValid, parseISO } from "date-fns";

/**
 * Utility functions for consistent date handling across the application
 */

/**
 * Safely converts various date formats to yyyy-MM-dd string format
 * Handles ISO dates, Date objects, and yyyy-MM-dd strings
 */
export const formatDateForInput = (dateValue: string | Date | null | undefined): string | null => {
  if (dateValue === null || dateValue === undefined) return null;
  if (typeof dateValue === 'string' && dateValue.trim() === '') return null;
  
  try {
    let date: Date;
    
    if (typeof dateValue === "string") {
      // Handle ISO format (2024-12-11T00:00:00.000Z or 2024-12-11T10:30:00)
      if (dateValue.includes('T')) {
        date = parseISO(dateValue);
      } 
      // Handle yyyy-MM-dd format - parse as local date to avoid timezone issues
      else if (dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = dateValue.split('-').map(Number);
        date = new Date(year, month - 1, day); // month is 0-indexed, creates local date
      }
      // Handle other date string formats
      else {
        date = new Date(dateValue);
      }
    } else {
      date = dateValue;
    }
    
    if (!isValid(date)) {
      console.warn("Invalid date provided:", dateValue);
      return null;
    }

    // Format using local date components to ensure we get the correct date
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;
    console.log("formatDateForInput:", { input: dateValue, output: formattedDate });
    return formattedDate;
  } catch (error) {
    console.error("Error formatting date:", error, "Input:", dateValue);
    return null;
  }
};

/**
 * Safely converts yyyy-MM-dd string to Date object
 * Treats date-only strings as local dates to avoid timezone issues
 */
export const parseInputDate = (dateStr: string): Date | undefined => {
  if (!dateStr) return undefined;
  
  try {
    // If it's already in yyyy-MM-dd format (date only, no time)
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // Parse as local date to avoid UTC conversion issues
      // Split the date string and create a local date object
      const [year, month, day] = dateStr.split('-').map(Number);
      const parsedDate = new Date(year, month - 1, day); // month is 0-indexed
      return isValid(parsedDate) ? parsedDate : undefined;
    }
    
    // If it's an ISO string with time component
    if (dateStr.includes('T')) {
      const parsedDate = parseISO(dateStr);
      return isValid(parsedDate) ? parsedDate : undefined;
    }
    
    // Try as regular date string
    const date = new Date(dateStr);
    return isValid(date) ? date : undefined;
  } catch (error) {
    console.error("Error parsing date:", error);
    return undefined;
  }
};

/**
 * Checks if a date string is valid and properly formatted
 */
export const isValidDateString = (dateStr: string): boolean => {
  return parseInputDate(dateStr) !== undefined;
};

/**
 * Formats a date for display (e.g., "December 11, 2024")
 */
export const formatDateForDisplay = (dateValue: string | Date | null | undefined): string => {
  const date = typeof dateValue === "string" ? parseInputDate(dateValue) : dateValue;
  
  if (!date || !isValid(date)) return "";
  
  try {
    return format(date, "PPP");
  } catch (error) {
    console.error("Error formatting date for display:", error);
    return "";
  }
};

/**
 * Formats a date for table display (shorter format)
 */
export const formatDate = (dateValue: string | Date | null | undefined): string => {
  const date = typeof dateValue === "string" ? parseInputDate(dateValue) : dateValue;
  
  if (!date || !isValid(date)) return "";
  
  try {
    return format(date, "MMM dd, yyyy");
  } catch (error) {
    console.error("Error formatting date:", error);
    return "";
  }
};
