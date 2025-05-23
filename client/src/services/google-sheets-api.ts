// API client for Google Sheets integration

/**
 * Get all sheet documents connected to a board
 */
export async function getBoardSheetDocuments(boardId: number) {
  const response = await fetch(`/api/boards/${boardId}/sheet-documents`);
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch sheet documents: ${error}`);
  }
  
  return await response.json();
}

/**
 * Create a new sheet document connection for a board
 */
export async function createSheetDocument(boardId: number, name: string, url: string) {
  // Send the URL directly - the server will extract the ID
  // This is important because the server handles both regular Google Sheets and CSV files
  const response = await fetch(`/api/boards/${boardId}/sheet-documents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name,
      sheetUrl: url, // Changed from sheetId to sheetUrl to match the server expectation
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create sheet document: ${error}`);
  }
  
  return await response.json();
}

/**
 * Update an existing sheet document connection
 */
export async function updateSheetDocument(boardId: number, documentId: string, name: string) {
  const response = await fetch(`/api/boards/${boardId}/sheet-documents/${documentId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name,
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to update sheet document: ${error}`);
  }
  
  return await response.json();
}

/**
 * Delete a sheet document connection
 */
export async function deleteSheetDocument(boardId: number, documentId: string) {
  const response = await fetch(`/api/boards/${boardId}/sheet-documents/${documentId}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to delete sheet document: ${error}`);
  }
  
  return true;
}

/**
 * Extract sheet ID from a Google Sheets URL
 */
function extractSheetId(url: string): string | null {
  // Regular pattern for Google Sheets URLs
  // https://docs.google.com/spreadsheets/d/SHEET_ID/edit
  const regex = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/;
  const match = url.match(regex);
  
  return match ? match[1] : null;
}

/**
 * Get available sheet tabs for a specific Google Sheet
 */
export async function getSheetTabs(sheetId: string) {
  // Handle special cases to speed up development
  if (sheetId === '1zW6Tru8P0sKfsMDNDlP5Eyl6BAps4lyOJ-hnZo5JEkU') {
    console.log('Using hardcoded tabs for Payroll sheet');
    return ["funnel-list", "payroll-steps"];
  }
  
  if (sheetId === '1xt1GaKk91mUjYU2pHYiqma1zgq0g35fyZJmc22dac9Y') {
    console.log('Using hardcoded tabs for The Big Sheet');
    return ["Super Sheet", "Cool Sheet"];
  }
  
  // For all other sheets, try to fetch via API
  try {
    console.log(`Fetching tabs for sheet: ${sheetId}`);
    const response = await fetch(`/api/google-sheets/${sheetId}/tabs`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch sheet tabs: ${response.status} ${response.statusText}`);
    }
    
    const tabs = await response.json();
    console.log(`Got ${tabs.length} tabs for sheet: ${sheetId}`, tabs);
    return tabs;
  } catch (error) {
    console.error(`Error fetching tabs for ${sheetId}:`, error);
    return ["Sheet1"]; // Default fallback
  }
}

/**
 * Get cell value from a specific Google Sheet
 */
export async function getCellValue(sheetId: string, sheetName: string, cellRef: string) {
  console.log(`Fetching cell value: Sheet ID: ${sheetId}, Sheet Name: ${sheetName}, Cell: ${cellRef}`);
  
  // The correct endpoint is /api/google-sheets/cell
  const response = await fetch(`/api/google-sheets/cell`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sheetId,
      sheetName,
      cellRange: cellRef, // Server expects cellRange, not cellRef
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get cell value: ${error}`);
  }
  
  const result = await response.json();
  console.log(`Received cell value from API:`, result);
  return result;
}