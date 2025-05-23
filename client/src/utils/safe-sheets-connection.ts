/**
 * This utility provides a safer way to connect Google Sheets
 * by preventing the white screen issue that occurs due to conflicts
 * between React Beautiful DnD and state updates.
 */

// Store connection data temporarily to prevent loss during page refresh
export const setTempConnectionData = (data: any) => {
  try {
    sessionStorage.setItem('pendingSheetConnection', JSON.stringify({
      data,
      timestamp: Date.now()
    }));
    console.log("📊 Stored temporary connection data:", data);
    return true;
  } catch (e) {
    console.error("Failed to store connection data:", e);
    return false;
  }
};

// Get connection data that was saved before a refresh
export const getTempConnectionData = () => {
  try {
    const savedData = sessionStorage.getItem('pendingSheetConnection');
    if (savedData) {
      const parsed = JSON.parse(savedData);
      // Only use if it's recent (within 60 seconds)
      if (Date.now() - parsed.timestamp < 60000) {
        console.log("📊 Retrieved temporary connection data:", parsed.data);
        return parsed.data;
      }
    }
    return null;
  } catch (e) {
    console.error("Failed to retrieve connection data:", e);
    return null;
  }
};

// Clear temporary connection data
export const clearTempConnectionData = () => {
  try {
    sessionStorage.removeItem('pendingSheetConnection');
    return true;
  } catch (e) {
    console.error("Failed to clear connection data:", e);
    return false;
  }
};

// Safely handle a Google Sheets connection completion
export const safelyCompleteConnection = (
  data: any,
  onClose: () => void,
  onComplete: (data: any) => void
) => {
  // First, backup the data in case of refresh/errors
  setTempConnectionData(data);
  
  // Close the dialog first to avoid React Beautiful DnD conflicts
  onClose();
  
  // Use setTimeout with a short delay to ensure dialog unmount is complete
  // This prevents DOM manipulation during active render cycles
  setTimeout(() => {
    try {
      // Attempt to complete the connection with the saved data
      onComplete(data);
      // Clear the temporary data if successful
      clearTempConnectionData();
    } catch (e) {
      console.error("Error during connection completion:", e);
      // Data remains in storage for recovery after refresh
    }
  }, 100);
};