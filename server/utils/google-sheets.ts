import { google } from 'googleapis';

// Initialize the Google Sheets API client with our API key
const sheets = google.sheets({ version: 'v4', auth: process.env.GOOGLE_API_KEY });

/**
 * Parse a Google Sheet ID from a URL
 * @param url Google Sheets URL
 * @returns Sheet ID or null if invalid URL
 */
export function parseSheetId(url: string): string | null {
  try {
    // Extract the sheet ID from different URL formats
    // Standard format: https://docs.google.com/spreadsheets/d/SHEET_ID/edit
    // Shared format: https://docs.google.com/spreadsheets/d/SHEET_ID/edit?usp=sharing
    const regex = /\/d\/([a-zA-Z0-9_-]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
  } catch (error) {
    console.error('Error parsing Google Sheet ID:', error);
    return null;
  }
}

/**
 * Fetch data from a Google Sheet
 * @param sheetId Google Sheet ID
 * @param range Sheet range (e.g., 'Sheet1!A1:Z1000')
 * @returns Array of arrays representing the sheet data
 */
export async function fetchSheetData(sheetId: string, range: string = ''): Promise<any[][]> {
  try {
    // If no range is provided, fetch first sheet data
    const actualRange = range || 'Sheet1';
    
    // Call the Google Sheets API
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: actualRange,
    });
    
    // Return the data
    return response.data.values as any[][] || [];
  } catch (error) {
    console.error('Error fetching Google Sheet data:', error);
    throw new Error(`Failed to fetch data from Google Sheet: ${error.message}`);
  }
}

/**
 * Get sheet names from a Google Spreadsheet
 * @param sheetId Google Sheet ID
 * @returns Array of sheet names
 */
export async function getSheetNames(sheetId: string): Promise<string[]> {
  try {
    // Call the Google Sheets API to get spreadsheet metadata
    const response = await sheets.spreadsheets.get({
      spreadsheetId: sheetId,
    });
    
    // Extract sheet names
    const sheetNames = response.data.sheets.map(sheet => sheet.properties.title);
    return sheetNames;
  } catch (error) {
    console.error('Error getting Google Sheet names:', error);
    throw new Error(`Failed to get sheet names: ${error.message}`);
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
  
  // Convert each row to a CSV line
  return data.map(row => {
    // Handle cells with commas, quotes, or newlines
    return row.map(cell => {
      if (cell === null || cell === undefined) {
        return '';
      }
      
      const cellStr = String(cell);
      // Escape quotes and wrap in quotes if needed
      if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
        return `"${cellStr.replace(/"/g, '""')}"`;
      }
      return cellStr;
    }).join(',');
  }).join('\n');
}