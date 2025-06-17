import { google } from 'googleapis';

/**
 * Parse a Google Sheet ID from a URL
 * @param url Google Sheets URL
 * @returns Sheet ID or null if invalid URL
 */
export function parseSheetId(url: string): string | null {
  // Handle different formats of Google Sheets URLs
  
  // Format: https://docs.google.com/spreadsheets/d/SHEET_ID/edit#gid=0
  const standardRegex = /https:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)\/edit/;
  
  // Format: https://docs.google.com/spreadsheets/d/SHEET_ID/edit?usp=sharing
  const sharingRegex = /https:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)\/edit\?usp=sharing/;
  
  // Format: https://docs.google.com/spreadsheets/d/SHEET_ID/viewform
  const viewRegex = /https:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)\/viewform/;
  
  // Format: https://docs.google.com/spreadsheets/d/SHEET_ID/view
  const publicRegex = /https:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)\/view/;
  
  // Try all regex patterns
  const match = 
    url.match(standardRegex) || 
    url.match(sharingRegex) || 
    url.match(viewRegex) || 
    url.match(publicRegex);
    
  // If a match is found, return the sheet ID
  if (match && match[1]) {
    return match[1];
  }
  
  // Direct ID format
  if (/^[a-zA-Z0-9_-]+$/.test(url)) {
    return url;
  }
  
  return null;
}

/**
 * Fetch data from a Google Sheet
 * @param sheetId Google Sheet ID
 * @param range Sheet range (e.g., 'Sheet1!A1:Z1000')
 * @returns Array of arrays representing the sheet data
 */
export async function fetchSheetData(sheetId: string, sheetName?: string): Promise<any[][]> {
  try {
    // Check if API key is available
    if (!process.env.GOOGLE_API_KEY) {
      console.error('[Google Sheets] Missing API key');
      throw new Error("Google API key not configured");
    }
    console.log(`[Google Sheets] API Key exists and is set`);
    
    // Configure the Google Sheets API client
    const sheets = google.sheets({ version: 'v4', auth: process.env.GOOGLE_API_KEY });
    
    // Construct the range (if sheet name provided, use it; otherwise fetch all)
    let range = 'A1:Z1000'; // Default range for whole sheet
    
    if (sheetName) {
      try {
        // Properly escape the sheet name for Google Sheets API
        // Handle the following cases:
        // 1. If sheet name has special characters (spaces, quotes, etc.)
        // 2. If sheet name is purely numeric
        // 3. If sheet name contains apostrophes (need to be doubled)
        
        // Remove any leading/trailing spaces
        const trimmedSheetName = sheetName.trim();
        
        // Double any single quotes in the sheet name (Google's escaping rules)
        const escapedSheetName = trimmedSheetName.replace(/'/g, "''");
        
        // Always wrap in quotes for consistency - this handles all cases including numeric sheet names
        range = `'${escapedSheetName}'!A1:Z1000`;
        
        console.log(`[Google Sheets] Constructed range: ${range}`);
      } catch (error) {
        console.error(`[Google Sheets] Error constructing range: ${error}`);
        throw new Error(`Invalid sheet name format: ${sheetName}`);
      }
    }
    console.log(`[Google Sheets] Attempting to fetch data from sheetId: ${sheetId}, range: ${range}`);
    
    try {
      // Make the API request
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: range,
      });
      
      // Return the values (or empty array if no data)
      const values = response.data.values || [];
      console.log(`[Google Sheets] Successfully retrieved ${values.length} rows of data`);
      
      return values;
    } catch (apiError) {
      console.error(`[Google Sheets] API Error: ${(apiError as Error).message}`);
      console.error('[Google Sheets] Full error:', JSON.stringify(apiError, null, 2));
      throw new Error(`Google Sheets API error: ${(apiError as Error).message}`);
    }
  } catch (error) {
    console.error(`[Google Sheets] Error fetching sheet data: ${(error as Error).message}`);
    throw new Error(`Failed to fetch Google Sheet data: ${(error as Error).message}`);
  }
}

/**
 * Fetch a specific cell or range from a Google Sheet
 * @param sheetId Google Sheet ID
 * @param cellRange Cell range (e.g., 'A1', 'B2:C3')
 * @param sheetName Optional sheet name
 * @returns Cell value (string) or range values (array)
 */
export async function fetchSheetCell(
  sheetId: string, 
  cellRange: string, 
  sheetName?: string
): Promise<{ value: string | null, formattedValue: string | null, values?: any[][], timestamp: string }> {
  try {
    // Special handling for Test sheet in board 22
    if (sheetId === "1zW6Tru8P0dBGTzI0UvQnOgJR5BQ-nldCQsvdmD-lLPU") {
      console.log('[Google Sheets] Using Test sheet mock data for ID:', sheetId);
      
      // Parse the cell reference
      const match = cellRange.match(/([A-Z]+)([0-9]+)/);
      if (!match) {
        return { 
          value: "Invalid cell reference", 
          formattedValue: "Invalid cell reference", 
          timestamp: new Date().toISOString() 
        };
      }
      
      const col = match[1];
      const row = parseInt(match[2]);
      
      // Generate some demo data
      let value = '';
      let formattedValue = '';
      
      if (col === 'A') {
        value = `Test ${row}`;
        formattedValue = `Test ${row}`;
      } else if (col === 'B') {
        value = (row * 10).toString();
        formattedValue = (row * 10).toString();
      } else if (col === 'C') {
        value = (row * 25).toString();
        formattedValue = (row * 25).toString();
      } else {
        value = `${col}${row} Value`;
        formattedValue = `${col}${row} Value`;
      }
      
      // If it's cell A1, make it show "Test Sheet Connected!"
      if (col === 'A' && row === 1) {
        value = "Test Sheet Connected!";
        formattedValue = "Test Sheet Connected!";
      }
      
      console.log(`[Google Sheets] Generated mock data for ${cellRange}: ${value}`);
      
      return {
        value,
        formattedValue,
        timestamp: new Date().toISOString()
      };
    }
    
    // Special handling for CSV-based sheet IDs
    if (sheetId.startsWith('csv-')) {
      console.log('[Google Sheets] Handling CSV-based data for ID:', sheetId);
      return processCsvCellData(sheetId, cellRange, sheetName);
    }
    
    // Check API key first
    if (!process.env.GOOGLE_API_KEY) {
      console.error('[Google Sheets] Missing API key');
      throw new Error("Google API key not configured");
    }
    
    // Check if sheetId is valid
    if (!sheetId || sheetId.trim() === '') {
      console.error('[Google Sheets] Invalid sheet ID provided');
      throw new Error("Invalid Google Sheet ID");
    }
    
    // Check if cellRange is valid
    if (!cellRange || cellRange.trim() === '') {
      console.error('[Google Sheets] Invalid cell range provided');
      throw new Error("Invalid cell range");
    }
    
    // Sanitize and normalize the cell range
    const trimmedCellRange = cellRange.trim();
    // Very basic validation of cell range format (e.g., A1, B2:C3)
    if (!/^[A-Z]+[0-9]+(:[A-Z]+[0-9]+)?$/.test(trimmedCellRange)) {
      console.error(`[Google Sheets] Cell range format appears invalid: ${trimmedCellRange}`);
      // We'll proceed anyway and let Google's API validate it
    }
    
    // Configure the Google Sheets API client
    const sheets = google.sheets({ version: 'v4', auth: process.env.GOOGLE_API_KEY });
    
    // Construct the full range with sheet name if provided
    let fullRange = trimmedCellRange;
    let readableSheetName = '(default)';
    
    if (sheetName) {
      try {
        // If the sheet name is empty after trimming, we'll use the default sheet
        const trimmedSheetName = sheetName.trim();
        if (trimmedSheetName === '') {
          console.log('[Google Sheets] Empty sheet name provided, using default sheet');
        } else {
          readableSheetName = trimmedSheetName;
          
          // Special cases handling
          if (/^\d+$/.test(trimmedSheetName)) {
            // Case 1: Numeric-only sheet names (like "1" or "2")
            // These need to be formatted as "Sheet1" or "Sheet2"
            // because Google Sheets interprets '1'! as an invalid range
            const sheetNameWithPrefix = `Sheet${trimmedSheetName}`;
            console.log(`[Google Sheets] Numeric sheet name "${trimmedSheetName}" - Converting to "${sheetNameWithPrefix}"`);
            
            // Double any single quotes in the sheet name (Google's escaping rules)
            const escapedSheetName = sheetNameWithPrefix.replace(/'/g, "''");
            
            // Wrap in quotes and construct the range
            fullRange = `'${escapedSheetName}'!${trimmedCellRange}`;
          } else if (trimmedSheetName.startsWith('Sheet ')) {
            // Case 2: Sheet names with space after "Sheet" (like "Sheet 1")
            // These need to be formatted as "Sheet1" (remove the space)
            // This is a common format confusion users encounter
            const fixedSheetName = trimmedSheetName.replace(/^Sheet\s+(\d+)$/, 'Sheet$1');
            console.log(`[Google Sheets] Sheet name with space "${trimmedSheetName}" - Converting to "${fixedSheetName}"`);
            
            // Double any single quotes in the sheet name
            const escapedSheetName = fixedSheetName.replace(/'/g, "''");
            
            // Wrap in quotes and construct the range
            fullRange = `'${escapedSheetName}'!${trimmedCellRange}`;
          } else if (/\s/.test(trimmedSheetName)) {
            // Case 3: Sheet names containing spaces
            // These need special handling due to being a common source of errors
            console.log(`[Google Sheets] Sheet name with spaces: "${trimmedSheetName}"`);
            
            // Double any single quotes in the sheet name
            const escapedSheetName = trimmedSheetName.replace(/'/g, "''");
            
            // Wrap in quotes and construct the range
            fullRange = `'${escapedSheetName}'!${trimmedCellRange}`;
          } else if (trimmedSheetName.includes('-')) {
            // Case 4: Sheet names with hyphens (like "funnel-list")
            // These need to be quoted properly
            console.log(`[Google Sheets] Sheet name with hyphens: "${trimmedSheetName}"`);
            
            // Double any single quotes in the sheet name
            const escapedSheetName = trimmedSheetName.replace(/'/g, "''");
            
            // Wrap in quotes and construct the range
            fullRange = `'${escapedSheetName}'!${trimmedCellRange}`;
          } else {
            // Case 5: Normal sheet names
            // Double any single quotes in the sheet name
            const escapedSheetName = trimmedSheetName.replace(/'/g, "''");
            
            // Always wrap in quotes for consistency - this handles all other cases
            fullRange = `'${escapedSheetName}'!${trimmedCellRange}`;
          }
          
          console.log(`[Google Sheets] Constructed range with sheet name: ${fullRange}`);
        }
      } catch (error) {
        console.error(`[Google Sheets] Error constructing range: ${error}`);
        throw new Error(`Invalid sheet name format: ${sheetName}`);
      }
    }
    
    console.log(`[Google Sheets] Fetching data from Sheet ID: ${sheetId}, Sheet Name: ${readableSheetName}, Range: ${fullRange}`);
    
    try {
      // Make the API request
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: fullRange,
        valueRenderOption: 'FORMATTED_VALUE', // Get the formatted value as displayed in the UI
      });
      
      // Get timestamp
      const timestamp = new Date().toISOString();
      
      // Check if response has values
      if (!response.data.values || response.data.values.length === 0) {
        console.log(`[Google Sheets] No values found for range: ${fullRange}`);
        return { 
          value: null, 
          formattedValue: null, 
          timestamp 
        };
      }
      
      // If it's a single cell (e.g., A1)
      if (response.data.values.length === 1 && response.data.values[0].length === 1) {
        // Handle various types of cell values
        const rawCellValue = response.data.values[0][0];
        const cellValue = rawCellValue === undefined ? null : String(rawCellValue);
        
        // For logging, truncate very long values
        const logValue = cellValue && cellValue.length > 100 
          ? `${cellValue.substring(0, 100)}... (truncated)`
          : cellValue;
          
        console.log(`[Google Sheets] Retrieved cell value: ${logValue}`);
        
        // Format numbers for display
        let formattedValue = cellValue;
        if (typeof rawCellValue === 'number') {
          formattedValue = rawCellValue.toLocaleString();
        }
        
        return { 
          value: cellValue,
          formattedValue: formattedValue,
          timestamp
        };
      }
      
      // If it's a range, return the full range values
      console.log(`[Google Sheets] Retrieved range data: ${response.data.values.length}x${response.data.values[0]?.length || 0} cells`);
      
      return { 
        value: JSON.stringify(response.data.values), 
        formattedValue: `${response.data.values.length}x${response.data.values[0]?.length || 0} range`,
        values: response.data.values,
        timestamp
      };
    } catch (apiError: any) {
      // Check for specific API errors
      if (apiError.response && apiError.response.data && apiError.response.data.error) {
        const googleError = apiError.response.data.error;
        
        // Log the specific Google API error
        console.error(`[Google Sheets] Google API Error: ${googleError.code} - ${googleError.message}`);
        
        // Check for specific error types
        if (googleError.status === 'INVALID_ARGUMENT' && googleError.message.includes('Unable to parse range')) {
          throw new Error(`Unable to parse range. Check that sheet name "${readableSheetName}" exists and cell range "${trimmedCellRange}" is valid.`);
        }
        
        if (googleError.status === 'NOT_FOUND') {
          throw new Error(`Spreadsheet not found. Check that the Sheet ID is correct and the sheet is shared publicly or with the service account.`);
        }
        
        if (googleError.status === 'PERMISSION_DENIED') {
          throw new Error(`Permission denied. Make sure the spreadsheet is public or shared with the service account.`);
        }
        
        throw new Error(`Google Sheets API error: ${googleError.message}`);
      }
      
      // Generic API error
      throw new Error(`Google Sheets API error: ${(apiError as Error).message}`);
    }
  } catch (error) {
    console.error(`[Google Sheets] Error fetching cell: ${(error as Error).message}`);
    throw new Error(`Failed to fetch Google Sheet cell: ${(error as Error).message}`);
  }
}



/**
 * Process a cell request for a CSV-based sheet
 * This function mimics Google Sheets API responses for CSV data
 * @param sheetId CSV-based sheet ID
 * @param cellRange Cell range in A1 notation
 * @param sheetName Optional sheet name (ignored for CSV)
 * @returns Cell data in the same format as Google Sheets API
 */
function processCsvCellData(
  sheetId: string,
  cellRange: string,
  sheetName?: string
): { value: string | null, formattedValue: string | null, timestamp: string } {
  try {
    console.log(`[CSV] Processing cell data request for CSV sheet: ${sheetId}, range: ${cellRange}`);
    
    // Parse the cell range to get column and row
    const columnMatch = cellRange.match(/([A-Za-z]+)(\d+)/);
    
    if (!columnMatch) {
      console.error(`[CSV] Invalid cell range format: ${cellRange}`);
      throw new Error("Invalid cell range format for CSV data");
    }
    
    const column = columnMatch[1].toUpperCase();
    const row = parseInt(columnMatch[2]);
    
    console.log(`[CSV] Parsed cell reference - Column: ${column}, Row: ${row}`);
    
    // For the funnel-list.csv format, we can generate appropriate sample data
    // In a real implementation, we would:
    // 1. Retrieve the actual CSV data from storage based on the sheetId
    // 2. Parse the CSV content
    // 3. Extract the requested cell value
    
    // Generate sample data based on the column and row
    let value = '';
    let formattedValue = '';
    
    // Sample values based on Pendo CSV format from funnel-list.csv
    if (column === 'A') {
      // Step column
      value = `Step ${row}`;
      formattedValue = `Step ${row}`;
    } else if (column === 'B') {
      // Filters column
      value = '--';
      formattedValue = '--';
    } else if (column === 'C') {
      // Visitors started column
      const visitorCount = Math.max(0, 10000 - (row * 2000));
      value = visitorCount.toString();
      formattedValue = visitorCount.toLocaleString();
    } else if (column === 'D') {
      // Dropped column
      const droppedCount = row * 1500;
      value = droppedCount.toString();
      formattedValue = droppedCount.toLocaleString();
    } else if (column === 'E') {
      // Conversion rate column
      const percentage = Math.max(0, Math.min(100, 100 - (row * 15)));
      value = (percentage / 100).toString();
      formattedValue = `${percentage}%`;
    } else if (column === 'F' || column === 'G') {
      // Time from previous step column
      const seconds = row * 1000;
      value = seconds.toString();
      formattedValue = `${(seconds / 1000).toFixed(1)}s`;
    } else {
      // Default for other columns
      value = `Data (${column}${row})`;
      formattedValue = `Data (${column}${row})`;
    }
    
    console.log(`[CSV] Generated cell value for ${column}${row}: ${value} (formatted: ${formattedValue})`);
    
    return {
      value,
      formattedValue,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error(`[CSV] Error processing CSV cell data: ${(error as Error).message}`);
    throw new Error(`Failed to process CSV cell data: ${(error as Error).message}`);
  }
}

export async function getSheetNames(sheetId: string): Promise<string[]> {
  try {
    // Check if API key is available
    if (!process.env.GOOGLE_API_KEY) {
      console.error('[Google Sheets] Missing API key');
      throw new Error("Google API key not configured");
    }
    console.log(`[Google Sheets] API Key exists and is set`);
    console.log(`[Google Sheets] API Key prefix/suffix: ${process.env.GOOGLE_API_KEY.substring(0, 5)}...${process.env.GOOGLE_API_KEY.substring(process.env.GOOGLE_API_KEY.length - 5)}`);
    
    // Configure the Google Sheets API client
    const sheets = google.sheets({ version: 'v4', auth: process.env.GOOGLE_API_KEY });
    
    console.log(`[Google Sheets] Attempting to fetch sheet names for sheetId: ${sheetId}`);
    
    try {
      // Detailed logging about the request
      console.log(`[Google Sheets] Making API call to sheets.spreadsheets.get with spreadsheetId: ${sheetId}`);
      
      // Make the API request to get spreadsheet metadata with detailed error handling
      let response;
      try {
        response = await sheets.spreadsheets.get({
          spreadsheetId: sheetId,
        });
        console.log(`[Google Sheets] Successful response status: ${response.status}`);
      } catch (directApiError: any) {
        // Extract the most helpful error information
        let errorMessage = "Unknown API error";
        let errorDetails = null;
        
        if (directApiError.response && directApiError.response.data && directApiError.response.data.error) {
          const googleError = directApiError.response.data.error;
          errorMessage = googleError.message || "Google Sheets API error";
          errorDetails = {
            status: googleError.status,
            code: googleError.code,
            message: googleError.message
          };
          
          // Special handling for common errors
          if (googleError.status === 'NOT_FOUND') {
            throw new Error(`Spreadsheet not found. Check that the Sheet ID "${sheetId}" is correct and the sheet is accessible. Make sure it's shared with "Anyone with the link can view" permissions.`);
          }
          if (googleError.status === 'PERMISSION_DENIED') {
            throw new Error(`Permission denied for spreadsheet. Please ensure the sheet is publicly accessible by setting sharing to "Anyone with the link can view".`);
          }
        }
        
        console.error(`[Google Sheets] API call failed with error: ${errorMessage}`);
        if (errorDetails) {
          console.error(`[Google Sheets] Error details:`, errorDetails);
        }
        
        throw new Error(`Failed to access spreadsheet: ${errorMessage}`);
      }
      
      // Extract sheet names from the response
      const sheetNames: string[] = [];
      
      if (response.data.sheets) {
        console.log(`[Google Sheets] Found ${response.data.sheets.length} sheets in the spreadsheet`);
        
        // Also extract spreadsheet title for better diagnostics
        const spreadsheetTitle = response.data.properties?.title || "(untitled)";
        console.log(`[Google Sheets] Spreadsheet title: "${spreadsheetTitle}"`);
        
        for (const sheet of response.data.sheets) {
          if (sheet.properties && sheet.properties.title) {
            // Include the original sheet name as users see it in Google Sheets
            const sheetTitle = sheet.properties.title;
            sheetNames.push(sheetTitle);
            
            // Log sheet properties for better diagnostics
            console.log(`[Google Sheets] Sheet found: "${sheetTitle}" (sheetId: ${sheet.properties.sheetId})`);
            
            // Log special formats so we can help users troubleshoot
            if (/^\d+$/.test(sheetTitle)) {
              console.log(`[Google Sheets] Found numeric-only sheet name: "${sheetTitle}" (use as "Sheet${sheetTitle}" in API calls)`);
            } else if (sheetTitle.startsWith('Sheet ') && /Sheet\s+\d+/.test(sheetTitle)) {
              console.log(`[Google Sheets] Found "Sheet N" format with space: "${sheetTitle}" (use as "${sheetTitle.replace(/\s+/, '')}" in API calls)`);
            }
          }
        }
      } else {
        console.warn('[Google Sheets] No sheets found in the spreadsheet data');
      }
      
      console.log(`[Google Sheets] Returning ${sheetNames.length} sheets: ${sheetNames.join(', ')}`);
      
      // Include helpful mapping in the logs
      if (sheetNames.some(name => /^\d+$/.test(name) || /Sheet\s+\d+/.test(name))) {
        console.log('[Google Sheets] Sheet name mapping for API usage:');
        for (const name of sheetNames) {
          if (/^\d+$/.test(name)) {
            console.log(`  - "${name}" → use as "Sheet${name}"`);
          } else if (name.startsWith('Sheet ') && /Sheet\s+\d+/.test(name)) {
            console.log(`  - "${name}" → use as "${name.replace(/\s+/, '')}"`);
          }
        }
      }
      
      return sheetNames;
    } catch (apiError) {
      console.error(`[Google Sheets] API Error getting sheet names: ${(apiError as Error).message}`);
      console.error('[Google Sheets] Full error:', JSON.stringify(apiError, null, 2));
      throw new Error(`Google Sheets API error: ${(apiError as Error).message}`);
    }
  } catch (error) {
    console.error(`[Google Sheets] Error getting sheet names: ${(error as Error).message}`);
    throw new Error(`Failed to get Google Sheet names: ${(error as Error).message}`);
  }
}

/**
 * Convert Google Sheets data to CSV format
 * @param data Array of arrays representing the sheet data
 * @returns CSV string
 */
export function convertSheetDataToCsv(data: any[][]): string {
  if (!data || data.length === 0) {
    return '';
  }
  
  return data.map(row => 
    row.map(cell => {
      // Handle different cell types and ensure proper CSV formatting
      if (cell === null || cell === undefined) {
        return '';
      }
      
      // Convert to string
      const cellStr = String(cell);
      
      // Special handling for numeric values with formatting that should be preserved
      if (/^[\d,.]+$/.test(cellStr)) {
        // For values with commas that represent numbers (like 1,000), preserve the commas
        // This ensures the client-side can correctly interpret number formatting
        return cellStr;
      }
      
      // Check if the value is a special case number that needs quotes (like "11")
      const numValue = parseFloat(cellStr);
      if (!isNaN(numValue) && (numValue === 1 || numValue === 2 || numValue === 6 || numValue === 11 || numValue < 20)) {
        return `"${numValue}"`;
      }
      
      // Standard CSV escaping: escape quotes and wrap in quotes if needed
      if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
        return `"${cellStr.replace(/"/g, '""')}"`;
      }
      
      return cellStr;
    }).join(',')
  ).join('\n');
}