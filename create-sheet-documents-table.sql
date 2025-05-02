-- Create the sheet_documents table
CREATE TABLE IF NOT EXISTS sheet_documents (
  id TEXT PRIMARY KEY,
  board_id INTEGER NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sheet_id TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sheet_documents_board_id ON sheet_documents(board_id);