import { useState, useRef, useEffect } from 'react';
import { toast } from "@/hooks/use-toast";

// This is a safer approach to Google Sheets connections
// It isolates sheet connections from React Beautiful DnD operations

interface SheetsConnectorProps {
  onConnect: (connectionData: any) => void;
  modalComponent: React.ComponentType<{
    isOpen: boolean;
    onClose: () => void;
    onComplete: (data: any) => void;
    initialData?: any;
  }>;
  initialData?: any;
}

export function SheetsConnector({ 
  onConnect, 
  modalComponent: ModalComponent,
  initialData
}: SheetsConnectorProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const processingRef = useRef(false);
  const connectionDataRef = useRef<any>(null);
  
  useEffect(() => {
    // This runs on unmount to ensure we complete any pending connections
    return () => {
      if (processingRef.current && connectionDataRef.current) {
        console.log("📊 [SheetsConnector] Component unmounted with pending connection, completing now");
        try {
          onConnect(connectionDataRef.current);
        } catch (err) {
          console.error("Error completing connection on unmount:", err);
          toast({
            title: "Connection Error",
            description: "There was a problem completing the connection. Please try again.",
            variant: "destructive"
          });
        }
      }
    };
  }, [onConnect]);
  
  const handleOpen = () => {
    setIsModalOpen(true);
  };
  
  const handleClose = () => {
    setIsModalOpen(false);
  };
  
  const handleComplete = (data: any) => {
    console.log("📊 [SheetsConnector] Connection data received:", data);
    
    // Store the data for safekeeping
    connectionDataRef.current = data;
    processingRef.current = true;
    
    // Backup to session storage in case of refresh
    try {
      sessionStorage.setItem('pendingSheetConnection', JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (e) {
      console.error("Failed to backup connection data:", e);
    }
    
    // Close the modal first
    handleClose();
    
    // Use requestAnimationFrame to schedule the connection after the UI updates
    window.requestAnimationFrame(() => {
      // Then wait for any DnD operations to finish
      setTimeout(() => {
        processingRef.current = false;
        try {
          onConnect(connectionDataRef.current);
          console.log("📊 [SheetsConnector] Connection successfully completed");
          
          // Clear the backup data
          sessionStorage.removeItem('pendingSheetConnection');
          connectionDataRef.current = null;
        } catch (err) {
          console.error("Error during connection:", err);
          toast({
            title: "Connection Error",
            description: "There was a problem completing the connection. Please try again.",
            variant: "destructive"
          });
        }
      }, 300);
    });
  };
  
  return (
    <>
      <button 
        onClick={handleOpen}
        className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
      >
        Connect to Sheet
      </button>
      
      {isModalOpen && (
        <ModalComponent
          isOpen={isModalOpen}
          onClose={handleClose}
          onComplete={handleComplete}
          initialData={initialData}
        />
      )}
    </>
  );
}