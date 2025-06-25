import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

console.log('[MAIN] Starting React app initialization...');
console.log('[MAIN] DOM ready state:', document.readyState);

const rootElement = document.getElementById("root");
console.log('[MAIN] Root element found:', !!rootElement);

if (!rootElement) {
  console.error('[MAIN] Root element not found!');
} else {
  console.log('[MAIN] Creating React root...');
  try {
    const root = createRoot(rootElement);
    console.log('[MAIN] React root created successfully');
    console.log('[MAIN] Rendering App component...');
    root.render(<App />);
    console.log('[MAIN] App component rendered');
  } catch (error) {
    console.error('[MAIN] Error creating or rendering React app:', error);
  }
}
