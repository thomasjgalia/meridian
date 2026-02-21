// src/mock/data.js
// Mock data — mirrors the DB schema and eventual API response shapes (camelCase).
// Replace these with real API calls once the backend is wired up.

export const MOCK_STATUSES = [
  { id: 1, name: 'Adrift',      color: '#94A3B8', isDefault: true,  isComplete: false, isBlocked: false },
  { id: 2, name: 'In Progress', color: '#3B82F6', isDefault: false, isComplete: false, isBlocked: false },
  { id: 3, name: 'In Irons',    color: '#F59E0B', isDefault: false, isComplete: false, isBlocked: true  },
  { id: 4, name: 'Complete',    color: '#10B981', isDefault: false, isComplete: true,  isBlocked: false },
]

export const MOCK_MERIDIANS = [
  { id: 1, name: 'Platform', color: '#0D9488', slug: 'platform' },
  { id: 2, name: 'Mobile',   color: '#7C3AED', slug: 'mobile'   },
]

export const MOCK_USERS = [
  { id: 1, displayName: 'Alex Chen',   email: 'alex@example.com',   avatarUrl: null },
  { id: 2, displayName: 'Jordan Lee',  email: 'jordan@example.com', avatarUrl: null },
  { id: 0, displayName: 'Dev User',    email: 'dev@meridian.local', avatarUrl: null },
]

export const MOCK_SPRINTS = [
  { id: 1, meridianId: 1, name: 'Sprint 4', state: 'active',   startDate: '2026-02-10', endDate: '2026-02-21' },
  { id: 2, meridianId: 1, name: 'Sprint 5', state: 'planning', startDate: '2026-02-24', endDate: '2026-03-07' },
]

export const MOCK_WORK_ITEMS = [
  // ── Platform › API Modernisation ─────────────────────────────────────────
  { id: 1,  meridianId: 1, parentId: null, type: 'arc',     title: 'API Modernisation',                     statusId: 2, assigneeId: null, sprintId: null, position: 0, description: 'Full overhaul of the platform API surface — moving to versioned REST endpoints with consistent error contracts.' },
  { id: 2,  meridianId: 1, parentId: 1,   type: 'episode', title: 'Authentication Overhaul',               statusId: 2, assigneeId: 1,    sprintId: 1,    position: 0, description: 'Replace legacy session auth with JWT + refresh token rotation across all services.' },
  { id: 3,  meridianId: 1, parentId: 1,   type: 'episode', title: 'Rate Limiting',                         statusId: 1, assigneeId: null, sprintId: null, position: 1, description: null },
  { id: 4,  meridianId: 1, parentId: 2,   type: 'signal',  title: 'Replace JWT library',                   statusId: 4, assigneeId: 1,    sprintId: 1,    position: 0, description: 'Swap jose for jsonwebtoken v9 — aligns with our Node 20 baseline.' },
  { id: 5,  meridianId: 1, parentId: 2,   type: 'signal',  title: 'Implement refresh token rotation',      statusId: 2, assigneeId: 2,    sprintId: 1,    position: 1, description: 'Single-use refresh tokens stored in DB. Rotation on every redemption.' },
  { id: 6,  meridianId: 1, parentId: 2,   type: 'signal',  title: 'Add token revocation endpoint',         statusId: 3, assigneeId: 1,    sprintId: 1,    position: 2, description: 'POST /auth/revoke — blocked on DB schema approval from security review.' },
  { id: 7,  meridianId: 1, parentId: 5,   type: 'relay',   title: 'Update token store schema',             statusId: 4, assigneeId: 2,    sprintId: 1,    position: 0, description: null },
  { id: 8,  meridianId: 1, parentId: 5,   type: 'relay',   title: 'Write rotation logic',                  statusId: 2, assigneeId: 2,    sprintId: 1,    position: 1, description: null },
  { id: 9,  meridianId: 1, parentId: 3,   type: 'signal',  title: 'Research rate limiting strategies',     statusId: 1, assigneeId: null, sprintId: null, position: 0, description: null },
  { id: 10, meridianId: 1, parentId: 3,   type: 'signal',  title: 'Design throttle config schema',         statusId: 1, assigneeId: null, sprintId: null, position: 1, description: null },

  // ── Platform › Observability ──────────────────────────────────────────────
  { id: 11, meridianId: 1, parentId: null, type: 'arc',     title: 'Observability',                         statusId: 1, assigneeId: null, sprintId: null, position: 1, description: 'Structured logging, distributed traces, and alerting across all platform services.' },
  { id: 12, meridianId: 1, parentId: 11,  type: 'episode', title: 'Structured Logging',                    statusId: 1, assigneeId: 2,    sprintId: 2,    position: 0, description: null },
  { id: 13, meridianId: 1, parentId: 12,  type: 'signal',  title: 'Define log schema',                     statusId: 1, assigneeId: 2,    sprintId: 2,    position: 0, description: null },

  // ── Mobile › iOS Launch ───────────────────────────────────────────────────
  { id: 14, meridianId: 2, parentId: null, type: 'arc',     title: 'iOS Launch',                            statusId: 2, assigneeId: null, sprintId: null, position: 0, description: 'Everything needed to ship the iOS app to the App Store.' },
  { id: 15, meridianId: 2, parentId: 14,  type: 'episode', title: 'Onboarding Flow',                       statusId: 2, assigneeId: 2,    sprintId: null, position: 0, description: 'First-run experience: welcome screens, permissions, and account connection.' },
  { id: 16, meridianId: 2, parentId: 14,  type: 'episode', title: 'App Store Submission',                  statusId: 1, assigneeId: null, sprintId: null, position: 1, description: null },
  { id: 17, meridianId: 2, parentId: 15,  type: 'signal',  title: 'Design welcome screens',                statusId: 4, assigneeId: 2,    sprintId: null, position: 0, description: null },
  { id: 18, meridianId: 2, parentId: 15,  type: 'signal',  title: 'Implement push notification consent',   statusId: 2, assigneeId: 2,    sprintId: null, position: 1, description: null },
  { id: 19, meridianId: 2, parentId: 15,  type: 'signal',  title: 'Account linking screen',                statusId: 1, assigneeId: null, sprintId: null, position: 2, description: null },
  { id: 20, meridianId: 2, parentId: 18,  type: 'relay',   title: 'Wire up UNUserNotificationCenter',      statusId: 2, assigneeId: 2,    sprintId: null, position: 0, description: null },
]

// ── Mock activity for the slide panel ─────────────────────────────────────────
export const MOCK_ACTIVITY = {
  5: [
    { id: 1, userId: 2, action: 'status_changed', fieldName: 'status', oldValue: 'Adrift', newValue: 'In Progress', createdAt: '2026-02-18T09:14:00Z' },
    { id: 2, userId: 1, action: 'assigned',        fieldName: 'assignee', oldValue: null,    newValue: 'Jordan Lee',  createdAt: '2026-02-17T14:30:00Z' },
    { id: 3, userId: 1, action: 'created',         fieldName: null,       oldValue: null,    newValue: null,          createdAt: '2026-02-15T10:00:00Z' },
  ],
}
