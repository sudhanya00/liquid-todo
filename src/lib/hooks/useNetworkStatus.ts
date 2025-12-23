/**
 * Network Status Hook
 * 
 * Detects online/offline status and provides sync capabilities
 */

import { useState, useEffect } from "react";

export interface NetworkStatus {
  isOnline: boolean;
  wasOffline: boolean; // True if we were offline and just came back online
}

export function useNetworkStatus() {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    wasOffline: false,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOnline = () => {
      console.log("[Network] Back online");
      setStatus({ isOnline: true, wasOffline: true });
      
      // Reset wasOffline after a brief delay
      setTimeout(() => {
        setStatus(prev => ({ ...prev, wasOffline: false }));
      }, 5000);
    };

    const handleOffline = () => {
      console.log("[Network] Went offline");
      setStatus({ isOnline: false, wasOffline: false });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return status;
}
