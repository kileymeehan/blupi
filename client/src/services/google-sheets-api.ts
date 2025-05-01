/**
 * Google Sheets API service
 * Provides functions for interacting with Google Sheets through our API
 */

/**
 * Validates a Google Sheets URL and extracts the sheet ID
 * @param url Google Sheets URL to validate
 * @returns Object with validation status and sheet ID if valid
 */
export async function validateSheetUrl(url: string): Promise<{ valid: boolean; sheetId?: string; message?: string }> {
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
        return {
          valid: false,
          message: 'Rate limit exceeded. Please wait a few moments and try again.'
        };
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
    // Check for rate limit or quota errors in the error message
    const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
    if (errorMsg.toLowerCase().includes('rate limit') || 
        errorMsg.toLowerCase().includes('quota') ||
        errorMsg.toLowerCase().includes('too many requests')) {
      return {
        valid: false,
        message: 'Rate limit exceeded. Please wait a few minutes before trying again.'
      };
    }
    
    return {
      valid: false,
      message: errorMsg
    };
  }
}

/**
 * Fetches sheet names from a Google Sheet
 * @param sheetId Google Sheet ID
 * @returns Array of sheet names
 */
export async function getSheetNames(sheetId: string): Promise<string[]> {
  try {
    const response = await fetch('/api/google-sheets/names', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sheetId })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch sheet names');
    }

    const data = await response.json();
    return data.sheetNames || [];
  } catch (error) {
    console.error('Error fetching sheet names:', error);
    throw error;
  }
}

/**
 * Fetches data from a specific cell in a Google Sheet
 * @param sheetId Google Sheet ID
 * @param cellRange Cell range to fetch (e.g., "A1" or "B2:C3")
 * @param sheetName Optional sheet name
 * @returns Cell data including value, formatted value, and timestamp
 */
export async function fetchSheetCell(
  sheetId: string,
  cellRange: string,
  sheetName?: string
): Promise<{
  value: string | null;
  formattedValue: string | null;
  timestamp: string;
}> {
  try {
    const response = await fetch('/api/google-sheets/cell', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sheetId, cellRange, sheetName })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch cell data');
    }

    const data = await response.json();
    return {
      value: data.value,
      formattedValue: data.formattedValue,
      timestamp: data.timestamp
    };
  } catch (error) {
    console.error('Error fetching cell data:', error);
    throw error;
  }
}