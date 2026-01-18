import { useState, useEffect } from "react";
import { useAuth } from "./use-auth";
import { fastapiService } from "@/services/fastapi-service";

/**
 * Hook to check if the current user has QMS Manager position
 * @returns {Object} { isQMSManager: boolean, loading: boolean, positionName: string | null }
 */
export const useQMSManager = () => {
  const { user } = useAuth();
  const [isQMSManager, setIsQMSManager] = useState(false);
  const [loading, setLoading] = useState(true);
  const [positionName, setPositionName] = useState<string | null>(null);

  useEffect(() => {
    const checkQMSManager = async () => {
      try {
        setLoading(true);
        
        // Get user ID
        const userId = (user as any)?.id || (user as any)?.employee?.id;
        
        if (!userId) {
          setIsQMSManager(false);
          setLoading(false);
          return;
        }

        // Get user details including position
        const userResponse = await fastapiService.getUser(userId);
        const positionId = userResponse.position_id;

        if (!positionId) {
          setIsQMSManager(false);
          setLoading(false);
          return;
        }

        // Get position details
        const positionResponse = await fastapiService.getPosition(positionId);
        const positionNameValue = positionResponse.name || "";
        
        setPositionName(positionNameValue);
        
        // Check if position name is "QMS Manager" (case-insensitive)
        const isQMS = positionNameValue.toLowerCase().trim() === "qms manager";
        setIsQMSManager(isQMS);
      } catch (error) {
        console.error("Error checking QMS Manager position:", error);
        setIsQMSManager(false);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      checkQMSManager();
    } else {
      setLoading(false);
    }
  }, [user]);

  return { isQMSManager, loading, positionName };
};
