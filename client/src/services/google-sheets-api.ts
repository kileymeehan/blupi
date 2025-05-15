/**
 * Google Sheets API service
 * Provides functions for interacting with Google Sheets through our API
 */

/**
 * Utility function to implement retry logic with exponential backoff
 * @param fn The async function to retry
 * @param maxRetries Maximum number of retry attempts
 * @param isRetryable Function to determine if error is retryable
 * @returns Result of the function call
 */
async function withRetry<T>(
  fn: () => Promise<T>, 
  maxRetries: number = 3,
  isRetryable: (error: any) => boolean = () => true
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Check if we should retry based on the error
      if (attempt >= maxRetries || !isRetryable(error)) {
        throw error;
      }
      
      // Calculate backoff delay: 1s, 2s, 4s, etc.
      const delay = Math.pow(2, attempt) * 1000;
      console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms delay`);
      
      // Wait before next attempt
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // This shouldn't be reached due to the throw in the loop, but TypeScript needs it
  throw lastError;
}

/**
 * Determines if an error is related to rate limiting
 * @param error Error object or message
 * @returns True if the error is related to rate limiting
 */
function isRateLimitError(error: any): boolean {
  const errorMsg = error instanceof Error ? error.message : String(error);
  return errorMsg.toLowerCase().includes('rate limit') || 
         errorMsg.toLowerCase().includes('quota') ||
         errorMsg.toLowerCase().includes('too many requests');
}

/**
 * Validates a Google Sheets URL and extracts the sheet ID
 * @param url Google Sheets URL to validate
 * @returns Object with validation status and sheet ID if valid
 */
export async function validateSheetUrl(url: string): Promise<{ valid: boolean; sheetId?: string; message?: string }> {
  return await withRetry(
    async () => {
      try {
        const response = await fetch('/api/google-sheets/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url })
        });

        const data = await response.json();
        
        if (!response.ok) {
          // Special handling for rate limit errors
          if (response.status === 429 || data.message?.includes('rate limit') || data.message?.includes('too many requests')) {
            throw new Error('Rate limit exceeded. Please wait a few moments and try again.');
          }
          
          return {
            valid: false,
            message: data.message || 'Failed to validate Google Sheet URL'
          };
        }

        return {
          valid: true,
          sheetId: data.sheetId
        };
      } catch (error) {
        console.error('Error validating Google Sheet URL:', error);
        
        // If it's a rate limit error, we want the retry mechanism to catch it
        if (isRateLimitError(error)) {
          throw error; // Let the retry mechanism handle it
        }
        
        // For non-rate-limit errors, return with invalid status
        const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          valid: false,
          message: errorMsg
        };
      }
    },
    3, // Maximum 3 retries
    isRateLimitError // Only retry for rate limit errors
  );
}

/**
 * Fetches sheet names from a Google Sheet
 * @param sheetId Google Sheet ID
 * @returns Array of sheet names
 */
export async function getSheetNames(sheetId: string): Promise<string[]> {
  return await withRetry(
    async () => {
      try {
        const response = await fetch('/api/google-sheets/names', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sheetId })
        });

        if (!response.ok) {
          const errorData = await response.json();
          // Check for rate limit errors
          if (response.status === 429 || 
              errorData.message?.toLowerCase().includes('rate limit') || 
              errorData.message?.toLowerCase().includes('quota') ||
              errorData.message?.toLowerCase().includes('too many requests')) {
            throw new Error('Rate limit exceeded. Please wait a few minutes before trying again.');
          }
          throw new Error(errorData.message || 'Failed to fetch sheet names');
        }

        const data = await response.json();
        return data.sheetNames || [];
      } catch (error) {
        console.error('Error fetching sheet names:', error);
        
        // For rate limit errors, pass them up to the retry mechanism
        if (isRateLimitError(error)) {
          throw error;
        }
        
        // For all other errors, just pass them through
        throw error;
      }
    },
    3, // Maximum 3 retries
    isRateLimitError // Only retry for rate limit errors
  );
}

/**
 * Fetches data from a specific cell in a Google Sheet
 * @param sheetId Google Sheet ID
 * @param cellRange Cell range to fetch (e.g., "A1" or "B2:C3")
 * @param sheetName Optional sheet name
 * @returns Cell data including value, formatted value, and timestamp
 */

/**
 * Gets all sheet documents associated with a board
 * @param boardId Board ID
 * @returns List of sheet documents
 */
export async function getBoardSheetDocuments(boardId: number): Promise<Array<{
  id: string;
  boardId: number;
  name: string;
  sheetId: string;
  createdAt: string;
  updatedAt: string;
}>> {
  console.log(`[API] Fetching sheet documents for board ID: ${boardId}`);
  return await withRetry(
    async () => {
      try {
        const response = await fetch(`/api/boards/${boardId}/sheet-documents`);
        console.log(`[API] Sheet documents response status: ${response.status}`);

        if (!response.ok) {
          const errorData = await response.json();
          console.error(`[API] Error fetching sheet documents: ${JSON.stringify(errorData)}`);
          throw new Error(errorData.message || 'Failed to fetch sheet documents');
        }

        const data = await response.json();
        console.log(`[API] Successfully retrieved ${data.length} sheet documents:`, data);
        return data;
      } catch (error) {
        console.error('[API] Error fetching sheet documents:', error);
        
        // For rate limit errors, pass them up to the retry mechanism
        if (isRateLimitError(error)) {
          throw error;
        }
        
        // For all other errors, just pass them through
        throw error;
      }
    },
    3, // Maximum 3 retries
    isRateLimitError // Only retry for rate limit errors
  );
}

/**
 * Creates a new sheet document for a board
 * @param boardId Board ID
 * @param name Name for the sheet document
 * @param sheetUrl Google Sheets URL
 * @returns Created sheet document
 */
export async function createSheetDocument(
  boardId: number, 
  name: string, 
  sheetUrl: string
): Promise<{
  id: string;
  boardId: number;
  name: string;
  sheetId: string;
  createdAt: string;
  updatedAt: string;
}> {
  return await withRetry(
    async () => {
      try {
        const response = await fetch(`/api/boards/${boardId}/sheet-documents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, sheetUrl })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to create sheet document');
        }

        return await response.json();
      } catch (error) {
        console.error('Error creating sheet document:', error);
        
        // For rate limit errors, pass them up to the retry mechanism
        if (isRateLimitError(error)) {
          throw error;
        }
        
        // For all other errors, just pass them through
        throw error;
      }
    },
    3, // Maximum 3 retries
    isRateLimitError // Only retry for rate limit errors
  );
}

/**
 * Updates a sheet document
 * @param boardId Board ID
 * @param documentId Document ID
 * @param name New name for the document
 * @returns Updated sheet document
 */
export async function updateSheetDocument(
  boardId: number,
  documentId: string,
  name: string
): Promise<{
  id: string;
  boardId: number;
  name: string;
  sheetId: string;
  createdAt: string;
  updatedAt: string;
}> {
  return await withRetry(
    async () => {
      try {
        const response = await fetch(`/api/boards/${boardId}/sheet-documents/${documentId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to update sheet document');
        }

        return await response.json();
      } catch (error) {
        console.error('Error updating sheet document:', error);
        
        // For rate limit errors, pass them up to the retry mechanism
        if (isRateLimitError(error)) {
          throw error;
        }
        
        // For all other errors, just pass them through
        throw error;
      }
    },
    3, // Maximum 3 retries
    isRateLimitError // Only retry for rate limit errors
  );
}

/**
 * Deletes a sheet document
 * @param boardId Board ID
 * @param documentId Document ID
 * @returns True if deletion was successful
 */
export async function deleteSheetDocument(
  boardId: number,
  documentId: string
): Promise<boolean> {
  return await withRetry(
    async () => {
      try {
        const response = await fetch(`/api/boards/${boardId}/sheet-documents/${documentId}`, {
          method: 'DELETE'
        });

        if (!response.ok && response.status !== 204) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to delete sheet document');
        }

        return true;
      } catch (error) {
        console.error('Error deleting sheet document:', error);
        
        // For rate limit errors, pass them up to the retry mechanism
        if (isRateLimitError(error)) {
          throw error;
        }
        
        // For all other errors, just pass them through
        throw error;
      }
    },
    3, // Maximum 3 retries
    isRateLimitError // Only retry for rate limit errors
  );
}

export async function fetchSheetCell(
  sheetId: string,
  cellRange: string,
  sheetName?: string
): Promise<{
  value: string | null;
  formattedValue: string | null;
  timestamp: string;
}> {
  return await withRetry(
    async () => {
      try {
        console.log(`Fetching sheet cell for sheet: ${sheetId}, range: ${cellRange}, sheetName: ${sheetName || 'default'}`);
        
        // Process sheetName if it's provided
        let normalizedSheetName = sheetName;
        if (normalizedSheetName && normalizedSheetName.trim() !== '') {
          normalizedSheetName = normalizedSheetName.trim();
          
          // Auto-correct common sheet name format issues
          
          // 1. Numeric sheet names need to be prefixed with "Sheet"
          if (/^\d+$/.test(normalizedSheetName)) {
            const oldName = normalizedSheetName;
            normalizedSheetName = `Sheet${normalizedSheetName}`;
            console.log(`[Auto-format] Converting numeric sheet name "${oldName}" to "${normalizedSheetName}"`);
          }
          // 2. Sheet names with space after "Sheet" (like "Sheet 1")
          else if (normalizedSheetName.startsWith('Sheet ') && /Sheet\s+\d+/.test(normalizedSheetName)) {
            const oldName = normalizedSheetName;
            normalizedSheetName = normalizedSheetName.replace(/\s+/, '');
            console.log(`[Auto-format] Converting sheet name with space "${oldName}" to "${normalizedSheetName}"`);
          }
        }
        
        // Properly format the request parameters
        const requestBody = {
          sheetId,
          cellRange,
          // Only include normalized sheetName if it's not undefined and not empty
          ...(normalizedSheetName && normalizedSheetName !== '' ? { sheetName: normalizedSheetName } : {})
        };
        
        console.log('Request body:', JSON.stringify(requestBody));
        
        const response = await fetch('/api/google-sheets/cell', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });
        
        // Log the response status for debugging
        console.log(`Response status: ${response.status}`);

        if (!response.ok) {
          const contentType = response.headers.get('content-type');
          let errorData;
          
          // Handle different response types (JSON, text, etc.)
          if (contentType && contentType.includes('application/json')) {
            errorData = await response.json();
            console.error('Error response (JSON):', errorData);
          } else {
            const textError = await response.text();
            console.error('Error response (text):', textError);
            errorData = { message: textError || 'Unknown error occurred' };
          }
          
          // Check for rate limit errors
          if (response.status === 429 || 
              errorData.message?.toLowerCase().includes('rate limit') || 
              errorData.message?.toLowerCase().includes('quota') ||
              errorData.message?.toLowerCase().includes('too many requests')) {
            throw new Error('Rate limit exceeded. Please wait a few minutes before trying again.');
          }
          
          // Check for parse errors
          if (errorData.message?.toLowerCase().includes('parse range')) {
            throw new Error(`Invalid range format. Please check your sheet name and cell reference. Details: ${errorData.message}`);
          }
          
          throw new Error(errorData.message || 'Failed to fetch cell data');
        }

        const data = await response.json();
        console.log('Successful response data:', data);
        
        return {
          value: data.value,
          formattedValue: data.formattedValue,
          timestamp: data.timestamp
        };
      } catch (error) {
        console.error('Error fetching cell data:', error);
        
        // For rate limit errors, let the retry mechanism handle them
        if (isRateLimitError(error)) {
          throw error;
        }
        
        // For all other errors, just pass them through
        throw error;
      }
    },
    3, // Maximum 3 retries
    isRateLimitError // Only retry for rate limit errors
  );
}