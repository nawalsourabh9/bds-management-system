
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
      // For Date objects, use it directly but extract local components
      date = dateValue;
    }
    
    if (!isValid(date)) {
      console.warn("Invalid date provided:", dateValue);
      return null;
    }

    // CRITICAL: Always use local date components (getFullYear, getMonth, getDate)
    // These methods return values in the local timezone, preventing timezone shifts
    // Do NOT use UTC methods (getUTCFullYear, getUTCMonth, getUTCDate) as they cause shifts
    const year = date.getFullYear();
    const month = date.getMonth(); // 0-indexed (0 = January, 11 = December)
    const day = date.getDate();
    
    // Create a new date at local midnight to ensure consistency
    const localDate = new Date(year, month, day);
    
    // Format using the local date components
    const formattedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
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
      // CRITICAL: Parse as local date to avoid UTC conversion issues
      // NEVER use new Date(dateStr) for date-only strings as it interprets as UTC
      // Split the date string and create a local date object at midnight
      const [year, month, day] = dateStr.split('-').map(Number);
      // Create date at local midnight (year, month-1, day) - month is 0-indexed
      const parsedDate = new Date(year, month - 1, day, 0, 0, 0, 0);
      return isValid(parsedDate) ? parsedDate : undefined;
    }
    
    // If it's an ISO string with time component
    if (dateStr.includes('T')) {
      // For ISO strings that represent date-only values (midnight UTC or local),
      // extract just the date part to avoid timezone conversion issues
      // This handles cases like "2025-01-19T00:00:00Z" or "2025-01-19T00:00:00"
      if (dateStr.match(/^\d{4}-\d{2}-\d{2}T00:00:00/)) {
        // Extract date part and create local date
        const datePart = dateStr.split('T')[0];
        const [year, month, day] = datePart.split('-').map(Number);
        return new Date(year, month - 1, day);
      }
      // For other ISO strings, parse normally but be aware of timezone issues
      const parsedDate = parseISO(dateStr);
      // If the parsed date's local date components don't match the ISO string's date,
      // it means timezone conversion shifted it - extract the date part instead
      const datePart = dateStr.split('T')[0];
      const [year, month, day] = datePart.split('-').map(Number);
      const localDate = new Date(year, month - 1, day);
      // Check if timezone conversion caused a shift
      if (parsedDate.getDate() !== day || parsedDate.getMonth() !== month - 1 || parsedDate.getFullYear() !== year) {
        // Timezone shift detected - use local date instead
        return localDate;
      }
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
  if (!dateValue) return "";
  
  try {
    let date: Date;
    
    // If it's a string, parse it first
    if (typeof dateValue === "string") {
      // If it's a date-only string (yyyy-MM-dd), parse it as local date
      if (dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = dateValue.split('-').map(Number);
        date = new Date(year, month - 1, day); // Create local date
      } else {
        // Parse using our parseInputDate function
        const parsed = parseInputDate(dateValue);
        if (!parsed || !isValid(parsed)) return "";
        date = parsed;
      }
    } else {
      date = dateValue;
    }
    
    if (!isValid(date)) return "";
    
    // CRITICAL: Always use local date components (getFullYear, getMonth, getDate)
    // These methods return values in the local timezone, preventing timezone shifts
    const year = date.getFullYear();
    const month = date.getMonth(); // 0-indexed (0 = January, 11 = December)
    const day = date.getDate();
    
    // Create a new date at local midnight to ensure consistency
    const localDate = new Date(year, month, day);
    
    // Format using date-fns which respects the local timezone
    return format(localDate, "PPP");
  } catch (error) {
    console.error("Error formatting date for display:", error, "Input:", dateValue);
    return "";
  }
};

/**
 * Formats a date for table display (shorter format)
 */
export const formatDate = (dateValue: string | Date | null | undefined): string => {
  if (!dateValue) return "";
  
  try {
    let date: Date;
    
    // If it's a string, parse it first
    if (typeof dateValue === "string") {
      // If it's a date-only string (yyyy-MM-dd), parse it as local date
      if (dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = dateValue.split('-').map(Number);
        date = new Date(year, month - 1, day); // Create local date
      } else {
        // Parse using our parseInputDate function
        const parsed = parseInputDate(dateValue);
        if (!parsed || !isValid(parsed)) return "";
        date = parsed;
      }
    } else {
      date = dateValue;
    }
    
    if (!isValid(date)) return "";
    
    // CRITICAL: Always use local date components (getFullYear, getMonth, getDate)
    // These methods return values in the local timezone, preventing timezone shifts
    const year = date.getFullYear();
    const month = date.getMonth(); // 0-indexed (0 = January, 11 = December)
    const day = date.getDate();
    
    // Create a new date at local midnight to ensure consistency
    const localDate = new Date(year, month, day);
    
    // Format using date-fns which respects the local timezone
    return format(localDate, "MMM dd, yyyy");
  } catch (error) {
    console.error("Error formatting date:", error, "Input:", dateValue);
    return "";
  }
};
