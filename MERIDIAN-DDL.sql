-- ============================================================
-- MERIDIAN — Azure SQL DDL
-- ============================================================

-- ============================================================
-- MERIDIANS
-- Top level organisation/tenant containers
-- ============================================================
CREATE TABLE meridians (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    name            NVARCHAR(200) NOT NULL,
    slug            NVARCHAR(100) NOT NULL UNIQUE,
    description     NVARCHAR(1000) NULL,
    color           VARCHAR(7) NULL,        -- hex color for identity e.g. #0D9488
    created_by      INT NOT NULL,
    created_at      DATETIME2 DEFAULT GETUTCDATE(),
    updated_at      DATETIME2 DEFAULT GETUTCDATE(),
    is_active       BIT DEFAULT 1
);

-- ============================================================
-- USERS
-- Seeded from Entra ID token on first login
-- ============================================================
CREATE TABLE users (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    azure_oid       NVARCHAR(100) NOT NULL UNIQUE,  -- Entra object ID
    tenant_id       NVARCHAR(100) NOT NULL,          -- Entra tenant ID
    email           NVARCHAR(300) NOT NULL,
    display_name    NVARCHAR(200) NOT NULL,
    avatar_url      NVARCHAR(500) NULL,
    created_at      DATETIME2 DEFAULT GETUTCDATE(),
    last_login      DATETIME2 NULL,
    is_active       BIT DEFAULT 1
);

-- ============================================================
-- MERIDIAN MEMBERS
-- Users joined to a meridian with a role
-- ============================================================
CREATE TABLE meridian_members (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    meridian_id     INT NOT NULL REFERENCES meridians(id),
    user_id         INT NOT NULL REFERENCES users(id),
    role            VARCHAR(20) NOT NULL DEFAULT 'member'
                    CHECK (role IN ('owner', 'member', 'viewer')),
    joined_at       DATETIME2 DEFAULT GETUTCDATE(),
    CONSTRAINT uq_meridian_member UNIQUE (meridian_id, user_id)
);

-- ============================================================
-- INVITATIONS
-- Invite links scoped to a meridian
-- ============================================================
CREATE TABLE invitations (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    meridian_id     INT NOT NULL REFERENCES meridians(id),
    token           NVARCHAR(100) NOT NULL UNIQUE,
    email           NVARCHAR(300) NULL,         -- null means open link
    role            VARCHAR(20) NOT NULL DEFAULT 'member',
    created_by      INT NOT NULL REFERENCES users(id),
    created_at      DATETIME2 DEFAULT GETUTCDATE(),
    expires_at      DATETIME2 NOT NULL,
    used_at         DATETIME2 NULL,
    used_by         INT NULL REFERENCES users(id)
);

-- ============================================================
-- STATUSES
-- Configurable per meridian
-- ============================================================
CREATE TABLE statuses (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    meridian_id     INT NOT NULL REFERENCES meridians(id),
    name            NVARCHAR(100) NOT NULL,
    color           VARCHAR(7) NOT NULL,        -- hex
    position        INT NOT NULL DEFAULT 0,     -- display order
    is_default      BIT DEFAULT 0,
    is_complete     BIT DEFAULT 0,              -- marks done states
    is_blocked      BIT DEFAULT 0,              -- marks in irons states
    CONSTRAINT uq_status_meridian_name UNIQUE (meridian_id, name)
);

-- ============================================================
-- SPRINTS
-- Time-boxed containers scoped to a meridian
-- ============================================================
CREATE TABLE sprints (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    meridian_id     INT NOT NULL REFERENCES meridians(id),  -- scoped to a meridian
    name            NVARCHAR(200) NOT NULL,
    goal            NVARCHAR(1000) NULL,
    state           VARCHAR(20) NOT NULL DEFAULT 'planning'
                    CHECK (state IN ('planning', 'active', 'complete')),
    start_date      DATE NULL,
    end_date        DATE NULL,
    created_by      INT NOT NULL REFERENCES users(id),
    created_at      DATETIME2 DEFAULT GETUTCDATE(),
    completed_at    DATETIME2 NULL
);

-- ============================================================
-- WORK ITEMS
-- Single table for all hierarchy levels
-- Arc > Episode > Signal > Relay via parent_id + type
-- ============================================================
CREATE TABLE work_items (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    meridian_id     INT NOT NULL REFERENCES meridians(id),  -- denormalized for fast filtering
    parent_id       INT NULL REFERENCES work_items(id),     -- null = Arc (top level)
    type            VARCHAR(20) NOT NULL
                    CHECK (type IN ('arc', 'episode', 'signal', 'relay')),
    title           NVARCHAR(500) NOT NULL,
    description     NVARCHAR(MAX) NULL,
    status_id       INT NULL REFERENCES statuses(id),
    assignee_id     INT NULL REFERENCES users(id),
    sprint_id       INT NULL REFERENCES sprints(id),
    start_date      DATE NULL,
    due_date        DATE NULL,
    position        INT NOT NULL DEFAULT 0,                 -- ordering within parent
    created_by      INT NOT NULL REFERENCES users(id),
    created_at      DATETIME2 DEFAULT GETUTCDATE(),
    updated_at      DATETIME2 DEFAULT GETUTCDATE(),
    completed_at    DATETIME2 NULL,
    is_active       BIT DEFAULT 1
);

-- ============================================================
-- ACTIVITY LOG
-- Audit trail for all work item changes
-- Powers the activity feed in the detail panel
-- ============================================================
CREATE TABLE activity_log (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    work_item_id    INT NOT NULL REFERENCES work_items(id),
    meridian_id     INT NOT NULL,                           -- denormalized for fast queries
    user_id         INT NOT NULL REFERENCES users(id),
    action          VARCHAR(50) NOT NULL,                   -- created, status_changed, assigned, edited, commented
    field_name      NVARCHAR(100) NULL,                     -- which field changed
    old_value       NVARCHAR(500) NULL,
    new_value       NVARCHAR(500) NULL,
    note            NVARCHAR(1000) NULL,                    -- for comments
    created_at      DATETIME2 DEFAULT GETUTCDATE()
);

-- ============================================================
-- NOTIFICATIONS
-- Simple polling-based notification system
-- ============================================================
CREATE TABLE notifications (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    user_id         INT NOT NULL REFERENCES users(id),
    work_item_id    INT NULL REFERENCES work_items(id),
    meridian_id     INT NULL,
    message         NVARCHAR(500) NOT NULL,
    is_read         BIT DEFAULT 0,
    created_at      DATETIME2 DEFAULT GETUTCDATE()
);

-- ============================================================
-- INDEXES
-- ============================================================

-- Work items — core board query patterns
CREATE INDEX ix_work_items_meridian        ON work_items (meridian_id, type, is_active);
CREATE INDEX ix_work_items_parent          ON work_items (parent_id);
CREATE INDEX ix_work_items_assignee        ON work_items (assignee_id);
CREATE INDEX ix_work_items_sprint          ON work_items (sprint_id);
CREATE INDEX ix_work_items_status          ON work_items (status_id);

-- Activity log
CREATE INDEX ix_activity_work_item         ON activity_log (work_item_id, created_at DESC);
CREATE INDEX ix_activity_meridian          ON activity_log (meridian_id, created_at DESC);

-- Notifications
CREATE INDEX ix_notifications_user         ON notifications (user_id, is_read, created_at DESC);

-- Members
CREATE INDEX ix_members_user               ON meridian_members (user_id);

-- Sprints
CREATE INDEX ix_sprints_meridian_state     ON sprints (meridian_id, state);

-- ============================================================
-- SEED: DEFAULT STATUSES FOR A NEW MERIDIAN
-- Call this after inserting a new meridian
-- ============================================================

-- Example seed procedure
GO
CREATE PROCEDURE sp_seed_default_statuses
    @meridian_id INT
AS
BEGIN
    INSERT INTO statuses (meridian_id, name, color, position, is_default, is_complete, is_blocked)
    VALUES
        (@meridian_id, 'Adrift',      '#94A3B8', 0, 1, 0, 0),  -- unassigned/unstarted
        (@meridian_id, 'In Progress', '#3B82F6', 1, 0, 0, 0),
        (@meridian_id, 'In Irons',    '#F59E0B', 2, 0, 0, 1),  -- blocked
        (@meridian_id, 'Complete',    '#10B981', 3, 0, 1, 0);
END;
