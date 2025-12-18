-- =============================================================================
-- RLS (Row-Level Security) Migration for Blupi
-- =============================================================================
-- This migration enables Row-Level Security on core tables to enforce 
-- data isolation at the database level. The application sets the session
-- context variable 'blupi.current_user_id' before each transaction.
--
-- Usage in Drizzle:
--   await db.transaction(async (tx) => {
--     await tx.execute(sql`SET LOCAL blupi.current_user_id = ${userId}`);
--     // All subsequent queries are automatically filtered
--   });
-- =============================================================================

-- Helper function to get current user ID from session context
CREATE OR REPLACE FUNCTION current_user_id() RETURNS INTEGER AS $$
BEGIN
  -- Returns NULL if not set (which will deny access via RLS policies)
  RETURN NULLIF(current_setting('blupi.current_user_id', true), '')::INTEGER;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =============================================================================
-- PROJECTS TABLE RLS
-- =============================================================================
-- Users can access projects they own OR are members of

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS projects_select_policy ON projects;
CREATE POLICY projects_select_policy ON projects
  FOR SELECT
  USING (
    user_id = current_user_id()
    OR id IN (
      SELECT project_id FROM project_members 
      WHERE user_id = current_user_id() AND status = 'active'
    )
  );

DROP POLICY IF EXISTS projects_insert_policy ON projects;
CREATE POLICY projects_insert_policy ON projects
  FOR INSERT
  WITH CHECK (user_id = current_user_id());

DROP POLICY IF EXISTS projects_update_policy ON projects;
CREATE POLICY projects_update_policy ON projects
  FOR UPDATE
  USING (
    user_id = current_user_id()
    OR id IN (
      SELECT project_id FROM project_members 
      WHERE user_id = current_user_id() AND role IN ('admin', 'owner') AND status = 'active'
    )
  );

DROP POLICY IF EXISTS projects_delete_policy ON projects;
CREATE POLICY projects_delete_policy ON projects
  FOR DELETE
  USING (user_id = current_user_id());

-- =============================================================================
-- BOARDS TABLE RLS
-- =============================================================================
-- Users can access boards they own, OR have permissions for, OR are in the project

ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE boards FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS boards_select_policy ON boards;
CREATE POLICY boards_select_policy ON boards
  FOR SELECT
  USING (
    user_id = current_user_id()
    OR id IN (
      SELECT board_id FROM board_permissions WHERE user_id = current_user_id()
    )
    OR project_id IN (
      SELECT id FROM projects WHERE user_id = current_user_id()
    )
    OR project_id IN (
      SELECT project_id FROM project_members 
      WHERE user_id = current_user_id() AND status = 'active'
    )
  );

DROP POLICY IF EXISTS boards_insert_policy ON boards;
CREATE POLICY boards_insert_policy ON boards
  FOR INSERT
  WITH CHECK (user_id = current_user_id());

DROP POLICY IF EXISTS boards_update_policy ON boards;
CREATE POLICY boards_update_policy ON boards
  FOR UPDATE
  USING (
    user_id = current_user_id()
    OR id IN (
      SELECT board_id FROM board_permissions 
      WHERE user_id = current_user_id() AND role IN ('owner', 'editor')
    )
  );

DROP POLICY IF EXISTS boards_delete_policy ON boards;
CREATE POLICY boards_delete_policy ON boards
  FOR DELETE
  USING (user_id = current_user_id());

-- =============================================================================
-- PROJECT_MEMBERS TABLE RLS
-- =============================================================================
-- Users can see members of projects they own or are members of

ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS project_members_select_policy ON project_members;
CREATE POLICY project_members_select_policy ON project_members
  FOR SELECT
  USING (
    user_id = current_user_id()
    OR project_id IN (
      SELECT id FROM projects WHERE user_id = current_user_id()
    )
    OR project_id IN (
      SELECT project_id FROM project_members pm2 
      WHERE pm2.user_id = current_user_id() AND pm2.status = 'active'
    )
  );

DROP POLICY IF EXISTS project_members_insert_policy ON project_members;
CREATE POLICY project_members_insert_policy ON project_members
  FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = current_user_id()
    )
    OR project_id IN (
      SELECT project_id FROM project_members 
      WHERE user_id = current_user_id() AND role IN ('admin', 'owner') AND status = 'active'
    )
  );

DROP POLICY IF EXISTS project_members_update_policy ON project_members;
CREATE POLICY project_members_update_policy ON project_members
  FOR UPDATE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = current_user_id()
    )
    OR project_id IN (
      SELECT project_id FROM project_members 
      WHERE user_id = current_user_id() AND role IN ('admin', 'owner') AND status = 'active'
    )
  );

DROP POLICY IF EXISTS project_members_delete_policy ON project_members;
CREATE POLICY project_members_delete_policy ON project_members
  FOR DELETE
  USING (
    user_id = current_user_id()
    OR project_id IN (
      SELECT id FROM projects WHERE user_id = current_user_id()
    )
  );

-- =============================================================================
-- BOARD_PERMISSIONS TABLE RLS
-- =============================================================================
-- Users can see permissions for boards they own or have access to

ALTER TABLE board_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_permissions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS board_permissions_select_policy ON board_permissions;
CREATE POLICY board_permissions_select_policy ON board_permissions
  FOR SELECT
  USING (
    user_id = current_user_id()
    OR board_id IN (
      SELECT id FROM boards WHERE user_id = current_user_id()
    )
    OR board_id IN (
      SELECT board_id FROM board_permissions bp2 
      WHERE bp2.user_id = current_user_id() AND bp2.role IN ('owner', 'editor')
    )
  );

DROP POLICY IF EXISTS board_permissions_insert_policy ON board_permissions;
CREATE POLICY board_permissions_insert_policy ON board_permissions
  FOR INSERT
  WITH CHECK (
    board_id IN (
      SELECT id FROM boards WHERE user_id = current_user_id()
    )
    OR board_id IN (
      SELECT board_id FROM board_permissions 
      WHERE user_id = current_user_id() AND role = 'owner'
    )
  );

DROP POLICY IF EXISTS board_permissions_update_policy ON board_permissions;
CREATE POLICY board_permissions_update_policy ON board_permissions
  FOR UPDATE
  USING (
    board_id IN (
      SELECT id FROM boards WHERE user_id = current_user_id()
    )
    OR board_id IN (
      SELECT board_id FROM board_permissions 
      WHERE user_id = current_user_id() AND role = 'owner'
    )
  );

DROP POLICY IF EXISTS board_permissions_delete_policy ON board_permissions;
CREATE POLICY board_permissions_delete_policy ON board_permissions
  FOR DELETE
  USING (
    user_id = current_user_id()
    OR board_id IN (
      SELECT id FROM boards WHERE user_id = current_user_id()
    )
  );

-- =============================================================================
-- NOTIFICATIONS TABLE RLS
-- =============================================================================
-- Users can only access their own notifications

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notifications_select_policy ON notifications;
CREATE POLICY notifications_select_policy ON notifications
  FOR SELECT
  USING (to_user_id = current_user_id());

DROP POLICY IF EXISTS notifications_insert_policy ON notifications;
CREATE POLICY notifications_insert_policy ON notifications
  FOR INSERT
  WITH CHECK (true); -- System can create notifications for any user

DROP POLICY IF EXISTS notifications_update_policy ON notifications;
CREATE POLICY notifications_update_policy ON notifications
  FOR UPDATE
  USING (to_user_id = current_user_id());

DROP POLICY IF EXISTS notifications_delete_policy ON notifications;
CREATE POLICY notifications_delete_policy ON notifications
  FOR DELETE
  USING (to_user_id = current_user_id());

-- =============================================================================
-- TEAM_MEMBERS TABLE RLS
-- =============================================================================
-- Users can see team members in their organization

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS team_members_select_policy ON team_members;
CREATE POLICY team_members_select_policy ON team_members
  FOR SELECT
  USING (
    user_id = current_user_id()
    OR organization_id IN (
      SELECT organization_id FROM team_members 
      WHERE user_id = current_user_id() AND status = 'active'
    )
  );

DROP POLICY IF EXISTS team_members_insert_policy ON team_members;
CREATE POLICY team_members_insert_policy ON team_members
  FOR INSERT
  WITH CHECK (
    invited_by = current_user_id()
    OR organization_id IN (
      SELECT organization_id FROM team_members 
      WHERE user_id = current_user_id() AND role = 'admin' AND status = 'active'
    )
  );

DROP POLICY IF EXISTS team_members_update_policy ON team_members;
CREATE POLICY team_members_update_policy ON team_members
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM team_members 
      WHERE user_id = current_user_id() AND role = 'admin' AND status = 'active'
    )
  );

DROP POLICY IF EXISTS team_members_delete_policy ON team_members;
CREATE POLICY team_members_delete_policy ON team_members
  FOR DELETE
  USING (
    user_id = current_user_id()
    OR organization_id IN (
      SELECT organization_id FROM team_members 
      WHERE user_id = current_user_id() AND role = 'admin' AND status = 'active'
    )
  );

-- =============================================================================
-- PENDING_INVITATIONS TABLE RLS
-- =============================================================================
-- Users can see invitations they sent

ALTER TABLE pending_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_invitations FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pending_invitations_select_policy ON pending_invitations;
CREATE POLICY pending_invitations_select_policy ON pending_invitations
  FOR SELECT
  USING (
    invited_by = current_user_id()
    OR organization_id IN (
      SELECT organization_id FROM team_members 
      WHERE user_id = current_user_id() AND role = 'admin' AND status = 'active'
    )
  );

DROP POLICY IF EXISTS pending_invitations_insert_policy ON pending_invitations;
CREATE POLICY pending_invitations_insert_policy ON pending_invitations
  FOR INSERT
  WITH CHECK (invited_by = current_user_id());

DROP POLICY IF EXISTS pending_invitations_update_policy ON pending_invitations;
CREATE POLICY pending_invitations_update_policy ON pending_invitations
  FOR UPDATE
  USING (
    invited_by = current_user_id()
    OR organization_id IN (
      SELECT organization_id FROM team_members 
      WHERE user_id = current_user_id() AND role = 'admin' AND status = 'active'
    )
  );

DROP POLICY IF EXISTS pending_invitations_delete_policy ON pending_invitations;
CREATE POLICY pending_invitations_delete_policy ON pending_invitations
  FOR DELETE
  USING (invited_by = current_user_id());

-- =============================================================================
-- FLAGGED_BLOCKS TABLE RLS
-- =============================================================================
-- Users can only access their own flagged blocks

ALTER TABLE flagged_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE flagged_blocks FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS flagged_blocks_select_policy ON flagged_blocks;
CREATE POLICY flagged_blocks_select_policy ON flagged_blocks
  FOR SELECT
  USING (user_id = current_user_id());

DROP POLICY IF EXISTS flagged_blocks_insert_policy ON flagged_blocks;
CREATE POLICY flagged_blocks_insert_policy ON flagged_blocks
  FOR INSERT
  WITH CHECK (user_id = current_user_id());

DROP POLICY IF EXISTS flagged_blocks_update_policy ON flagged_blocks;
CREATE POLICY flagged_blocks_update_policy ON flagged_blocks
  FOR UPDATE
  USING (user_id = current_user_id());

DROP POLICY IF EXISTS flagged_blocks_delete_policy ON flagged_blocks;
CREATE POLICY flagged_blocks_delete_policy ON flagged_blocks
  FOR DELETE
  USING (user_id = current_user_id());

-- =============================================================================
-- USERS TABLE - NO RLS (public read for user lookups)
-- =============================================================================
-- Users table does not have RLS as user profiles are generally readable
-- for collaboration features (displaying usernames, avatars, etc.)

-- =============================================================================
-- SHEET_DOCUMENTS TABLE RLS
-- =============================================================================
-- Users can access sheet documents for projects they have access to

ALTER TABLE sheet_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE sheet_documents FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sheet_documents_select_policy ON sheet_documents;
CREATE POLICY sheet_documents_select_policy ON sheet_documents
  FOR SELECT
  USING (
    id IN (
      SELECT sheet_document_id FROM project_sheet_documents 
      WHERE project_id IN (
        SELECT id FROM projects WHERE user_id = current_user_id()
      )
      OR project_id IN (
        SELECT project_id FROM project_members 
        WHERE user_id = current_user_id() AND status = 'active'
      )
    )
  );

DROP POLICY IF EXISTS sheet_documents_insert_policy ON sheet_documents;
CREATE POLICY sheet_documents_insert_policy ON sheet_documents
  FOR INSERT
  WITH CHECK (true); -- Insert allowed, access controlled via project_sheet_documents

DROP POLICY IF EXISTS sheet_documents_update_policy ON sheet_documents;
CREATE POLICY sheet_documents_update_policy ON sheet_documents
  FOR UPDATE
  USING (
    id IN (
      SELECT sheet_document_id FROM project_sheet_documents 
      WHERE project_id IN (
        SELECT id FROM projects WHERE user_id = current_user_id()
      )
    )
  );

DROP POLICY IF EXISTS sheet_documents_delete_policy ON sheet_documents;
CREATE POLICY sheet_documents_delete_policy ON sheet_documents
  FOR DELETE
  USING (
    id IN (
      SELECT sheet_document_id FROM project_sheet_documents 
      WHERE project_id IN (
        SELECT id FROM projects WHERE user_id = current_user_id()
      )
    )
  );

-- =============================================================================
-- PROJECT_SHEET_DOCUMENTS TABLE RLS
-- =============================================================================

ALTER TABLE project_sheet_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_sheet_documents FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS project_sheet_documents_select_policy ON project_sheet_documents;
CREATE POLICY project_sheet_documents_select_policy ON project_sheet_documents
  FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = current_user_id()
    )
    OR project_id IN (
      SELECT project_id FROM project_members 
      WHERE user_id = current_user_id() AND status = 'active'
    )
  );

DROP POLICY IF EXISTS project_sheet_documents_insert_policy ON project_sheet_documents;
CREATE POLICY project_sheet_documents_insert_policy ON project_sheet_documents
  FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = current_user_id()
    )
    OR project_id IN (
      SELECT project_id FROM project_members 
      WHERE user_id = current_user_id() AND role IN ('admin', 'owner') AND status = 'active'
    )
  );

DROP POLICY IF EXISTS project_sheet_documents_update_policy ON project_sheet_documents;
CREATE POLICY project_sheet_documents_update_policy ON project_sheet_documents
  FOR UPDATE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = current_user_id()
    )
  );

DROP POLICY IF EXISTS project_sheet_documents_delete_policy ON project_sheet_documents;
CREATE POLICY project_sheet_documents_delete_policy ON project_sheet_documents
  FOR DELETE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = current_user_id()
    )
  );

-- =============================================================================
-- GRANT USAGE ON FUNCTION
-- =============================================================================
-- Allow the application user to call the helper function
GRANT EXECUTE ON FUNCTION current_user_id() TO PUBLIC;

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================
-- Run these to verify RLS is enabled:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
-- SELECT * FROM pg_policies WHERE schemaname = 'public';
