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
    // Check if API key is available
    if (!process.env.GOOGLE_API_KEY) {
      console.error('[Google Sheets] Missing API key');
      throw new Error("Google API key not configured");
    }
    
    // Configure the Google Sheets API client
    const sheets = google.sheets({ version: 'v4', auth: process.env.GOOGLE_API_KEY });
    
    // Construct the full range with sheet name if provided
    let fullRange = cellRange;
    
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
        fullRange = `'${escapedSheetName}'!${cellRange}`;
        
        console.log(`[Google Sheets] Constructed range: ${fullRange}`);
      } catch (error) {
        console.error(`[Google Sheets] Error constructing range: ${error}`);
        throw new Error(`Invalid sheet name format: ${sheetName}`);
      }
    }
    
    console.log(`[Google Sheets] Fetching cell: ${fullRange} from sheet: ${sheetId}`);
    
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
      return { value: null, formattedValue: null, timestamp };
    }
    
    // If it's a single cell (e.g., A1)
    if (response.data.values.length === 1 && response.data.values[0].length === 1) {
      const cellValue = response.data.values[0][0] || null;
      console.log(`[Google Sheets] Retrieved cell value: ${cellValue}`);
      
      // Format value for display (if numeric, ensure it has appropriate formatting)
      let formattedValue = cellValue;
      if (typeof cellValue === 'number') {
        formattedValue = cellValue.toLocaleString();
      }
      
      return { 
        value: cellValue,
        formattedValue: formattedValue,
        timestamp
      };
    }
    
    // If it's a range, return the full range values
    return { 
      value: JSON.stringify(response.data.values), 
      formattedValue: `${response.data.values.length}x${response.data.values[0]?.length || 0} range`,
      values: response.data.values,
      timestamp
    };
    
  } catch (error) {
    console.error(`[Google Sheets] Error fetching cell: ${(error as Error).message}`);
    throw new Error(`Failed to fetch Google Sheet cell: ${(error as Error).message}`);
  }
}

/**
 * Get sheet names from a Google Spreadsheet
 * @param sheetId Google Sheet ID
 * @returns Array of sheet names
 */
export async function getSheetNames(sheetId: string): Promise<string[]> {
  try {
    // Check if API key is available
    if (!process.env.GOOGLE_API_KEY) {
      console.error('[Google Sheets] Missing API key');
      throw new Error("Google API key not configured");
    }
    console.log(`[Google Sheets] API Key exists and is set`);
    
    // Configure the Google Sheets API client
    const sheets = google.sheets({ version: 'v4', auth: process.env.GOOGLE_API_KEY });
    
    console.log(`[Google Sheets] Attempting to fetch sheet names for sheetId: ${sheetId}`);
    
    try {
      // Make the API request to get spreadsheet metadata
      const response = await sheets.spreadsheets.get({
        spreadsheetId: sheetId,
      });
      
      // Extract sheet names from the response
      const sheetNames: string[] = [];
      
      if (response.data.sheets) {
        for (const sheet of response.data.sheets) {
          if (sheet.properties && sheet.properties.title) {
            sheetNames.push(sheet.properties.title);
          }
        }
      }
      
      console.log(`[Google Sheets] Found ${sheetNames.length} sheets: ${sheetNames.join(', ')}`);
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