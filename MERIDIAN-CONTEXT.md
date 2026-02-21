# Meridian — Project Context for Claude Code

## What Is Meridian

Meridian is a lean, opinionated work tracking application built as a deliberate antidote to Jira's complexity and silos. It is named after the navigation reference line — the fixed point from which everything is measured. Every design decision should reinforce two principles: **clarity of position** and **freedom of movement** across work.

Meridian is built for small teams who need sprint-based work tracking without enterprise bloat. The board is the home. Everything radiates from it.

---

## The Vocabulary

Meridian uses a coherent navigation/field-operative vocabulary throughout. These terms are non-negotiable — they appear in the UI, the API, and the database.

| Level | Term | Meaning |
|-------|------|---------|
| 0 | **Meridian** | The top-level organisation or tenant container |
| 1 | **Arc** | A major body of work — a campaign with a beginning and end |
| 2 | **Episode** | A bounded chapter within an Arc |
| 3 | **Signal** | A defined piece of work filed within an Episode |
| 4 | **Relay** | An atomic action carried forward from a Signal |

### Vocabulary rules
- Never use Epic, Story, Task, or Subtask anywhere in the UI or code
- Status terms should align with the theme where possible — prefer **In Progress**, **Blocked**, **Complete** over Jira-style language
- Unassigned work items may be referred to as **Adrift**
- Blocked items may be referred to as **In Irons**

---

## Core Principles

### 1. Destroy silos
Meridian containers are lenses, not prisons. A user can see work items across all Meridians simultaneously. Filters narrow the view — they do not wall off data. No work item is ever invisible unless the user explicitly filters it out.

### 2. Board-centric navigation
The nested list board is the primary and permanent surface. The user never navigates away from it. Item detail opens in a right-side slide panel at ~40% width. Filters sit above the board. All actions — create, edit, status change, assignment — happen inline or in the panel without a page transition.

### 3. Hierarchy through indentation
Work items are displayed as a nested collapsible tree directly reflecting the parent_id hierarchy. Expand and collapse at any level. The hierarchy is visible at a glance without clicking into separate pages.

### 4. Progressive filtering
The filter bar sits above the board and allows filtering by any combination of:
- Meridian
- Arc
- Episode
- Assignee
- Status
- Sprint

All filters are optional and additive. No filter selected means everything is visible. Selecting filters progressively narrows without changing the underlying structure.

### 5. Responsive creation and editing
- New work items can be created inline at any level with a single click
- Titles are edited inline on the board
- Full detail editing in the right slide panel
- Parent reassignment via drag or dropdown
- Status cycles on a single click of the status chip

### 6. Sprints
- Sprints are time-boxed containers of Signals and Relays
- A sprint belongs to a Meridian but can contain work items from any Arc or Episode within it
- Sprint planning view: drag items from backlog into sprint
- Active sprint is always visible as a filter option on the board
- Sprint state: Planning, Active, Complete

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite |
| Backend | Azure Functions (Node.js) |
| Database | Azure SQL (Basic tier, always warm) |
| Auth | Microsoft Entra ID (single tenant to start, multi-tenant ready) |
| Hosting | Azure Static Web Apps |
| Icons | Custom SVG set (Lucide base where applicable) |
| Drag and Drop | dnd-kit |
| Styling | Tailwind CSS |

---

## Authentication

- Microsoft Entra ID via MSAL
- On first login, user record is created from Entra token claims (name, email, azure_oid, tenant_id)
- Users join a Meridian via invite link
- Invite links are scoped to a Meridian, have an expiry, and are single-use
- Roles: Owner, Member, Viewer

### Multi-tenancy readiness
- Always store `azure_oid` and `tenant_id` on the users table
- Never hardcode tenant ID in application logic
- All data access scoped through meridian_members even for single-user instances

---

## User Model

### Meridian ownership and membership
Each user has an independent relationship with each Meridian they belong to via `meridian_members`. A user can:

- Own multiple private Meridians visible only to themselves
- Own or be a member of shared Meridians with other users
- Have no visibility into Meridians they are not a member of

The board surfaces only Meridians the authenticated user belongs to. Filters reflect that user's membership scope — never global.

### Example scenarios
- **Single user, multiple Meridians** — one user owns three Meridians, all private. Three rows in `meridian_members`, all pointing to the same user. Nobody else sees them.
- **Collaborative Meridian** — owner sends an invite link to a second user. On accepting, a `meridian_members` row is created for the second user. Both users see it on their respective boards.
- **Second user's private Meridian** — the second user creates their own Meridian. The owner of the first Meridian has no visibility unless explicitly invited.

### Meridian creation
Any authenticated user can create a Meridian by default. If controlled rollout is needed, a `can_create_meridian` flag on the `users` table gates creation without requiring a schema change beyond adding that column.

### Board scoping
The board query always filters by `meridian_id IN (SELECT meridian_id FROM meridian_members WHERE user_id = @current_user)`. This single constraint enforces all visibility rules naturally — no special casing required.

---

## UI Philosophy

- **Density**: Compact. Row height 36-40px. One line per work item.
- **Chrome**: Minimal. No fat sidebars. No decorative headers.
- **Color**: Status and Meridian identity conveyed through small color chips and avatars
- **Mobile**: List view with full-screen item detail. No attempt to render kanban on mobile.
- **Dark mode**: Supported via Tailwind dark class
- **Navigation**: No page routing beyond auth. Everything is the board.

### Work item row anatomy
```
[expand ▼] [type icon] [title text ................] [sprint] [assignee avatar] [status chip] [⋯]
```

### Right slide panel contains
- Breadcrumb: Meridian > Arc > Episode > Signal
- Title (inline editable)
- Status (clickable chip)
- Assignee (avatar, clickable)
- Sprint assignment
- Description (rich text)
- Child items (mini nested list)
- Activity log

---

## Icon Set

Custom SVG icons, stroke-based, 2.5px weight, currentColor, scale to 18px.

| Level | Icon |
|-------|------|
| Meridian | Tilted sextant (triangle + vertical index arm + arc base) |
| Arc | Single sweep curve |
| Episode | Circle with filled quarter segment |
| Signal | Pulse/heartbeat line |
| Relay | Triple forward chevron |

---

## What Meridian Will NOT Do

These are explicitly out of scope. Do not add them.

- Gantt charts
- Time tracking
- Billing or invoicing
- File attachments (phase 1)
- Real-time websocket updates (phase 1 — polling is fine)
- Granular permissions beyond Owner/Member/Viewer
- Workflow automation or rules engines
- Integrations with external tools (phase 1)
- Reporting or burndown charts (phase 1)

---

## Data Model Summary

Single `work_items` table handles all four hierarchy levels via `type` column and self-referencing `parent_id`. This eliminates separate tables for Arcs, Episodes, Signals, and Relays and simplifies cross-hierarchy board queries significantly.

`meridian_id` is stored directly on every work item for fast cross-meridian filtering without recursive joins.

See DDL file for full schema.
