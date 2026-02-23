import { useState, useEffect, useRef } from 'react'
import { X, Copy, Check, Trash2, UserMinus, Plus, GripVertical, AlertTriangle } from 'lucide-react'
import { api } from '../../api/client'
import Avatar from '../ui/Avatar'

const ROLE_LABELS = { owner: 'Owner', member: 'Member', viewer: 'Viewer' }
const TTL_OPTIONS = [
  { label: '24 hours', hours: 24  },
  { label: '3 days',   hours: 72  },
  { label: '7 days',   hours: 168 },
]
const TABS = ['general', 'statuses', 'members', 'invitations']

// ── Colour swatch picker ──────────────────────────────────────────────────────

const SWATCHES = [
  '#0D9488', '#7C3AED', '#3B82F6', '#F59E0B',
  '#EC4899', '#EF4444', '#10B981', '#F97316',
  '#6366F1', '#84CC16', '#06B6D4', '#8B5CF6',
]

function ColorPicker({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {SWATCHES.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
          style={{
            backgroundColor: c,
            borderColor: value === c ? '#1f2937' : 'transparent',
          }}
        />
      ))}
      {/* Raw hex input */}
      <input
        type="color"
        value={value ?? '#0D9488'}
        onChange={(e) => onChange(e.target.value)}
        className="w-6 h-6 rounded-full cursor-pointer border-0 p-0 bg-transparent"
        title="Custom colour"
      />
    </div>
  )
}

// ── GeneralTab ────────────────────────────────────────────────────────────────

function GeneralTab({ meridian, onSaved, onDeleted }) {
  const [name,        setName]        = useState(meridian.name)
  const [slug,        setSlug]        = useState(meridian.slug)
  const [description, setDescription] = useState(meridian.description ?? '')
  const [color,       setColor]       = useState(meridian.color ?? '#0D9488')
  const [isActive,    setIsActive]    = useState(meridian.isActive ?? true)
  const [startDate,   setStartDate]   = useState(meridian.startDate ?? '')
  const [endDate,     setEndDate]     = useState(meridian.endDate ?? '')
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState(null)
  const [confirmDel,  setConfirmDel]  = useState(false)
  const [deleting,    setDeleting]    = useState(false)

  const isDirty =
    name        !== meridian.name         ||
    slug        !== meridian.slug         ||
    description !== (meridian.description ?? '') ||
    color       !== (meridian.color ?? '#0D9488') ||
    isActive    !== (meridian.isActive ?? true)   ||
    startDate   !== (meridian.startDate ?? '')    ||
    endDate     !== (meridian.endDate ?? '')

  async function handleSave(e) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setError(null)
    try {
      await api.patch(`/api/meridians/${meridian.id}`, {
        name:        name.trim(),
        slug:        slug.trim(),
        description: description.trim() || null,
        color,
        isActive,
        startDate:   startDate || null,
        endDate:     endDate   || null,
      })
      onSaved({ ...meridian, name: name.trim(), slug: slug.trim(), description: description.trim() || null, color, isActive, startDate: startDate || null, endDate: endDate || null })
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await api.delete(`/api/meridians/${meridian.id}`)
      onDeleted(meridian.id)
    } catch (err) {
      setError(err.message)
      setDeleting(false)
      setConfirmDel(false)
    }
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-4">

      {/* Name */}
      <div className="flex flex-col gap-1">
        <label className="text-2xs font-semibold text-gray-400 uppercase tracking-wider">Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-8 px-2.5 rounded-md border border-gray-300 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-meridian-500 hover:border-gray-400"
        />
      </div>

      {/* Slug */}
      <div className="flex flex-col gap-1">
        <label className="text-2xs font-semibold text-gray-400 uppercase tracking-wider">Slug</label>
        <div className="flex items-center">
          <span className="h-8 flex items-center px-2.5 bg-gray-50 border border-r-0 border-gray-300 rounded-l-md text-sm text-gray-400">/</span>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            className="h-8 flex-1 px-2.5 rounded-r-md border border-gray-300 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-meridian-500 hover:border-gray-400"
          />
        </div>
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1">
        <label className="text-2xs font-semibold text-gray-400 uppercase tracking-wider">
          Description <span className="normal-case font-normal text-gray-300">(optional)</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="What is this meridian about?"
          className="px-2.5 py-1.5 rounded-md border border-gray-300 text-sm text-gray-800 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-meridian-500 hover:border-gray-400"
        />
      </div>

      {/* Color */}
      <div className="flex flex-col gap-2">
        <label className="text-2xs font-semibold text-gray-400 uppercase tracking-wider">Colour</label>
        <ColorPicker value={color} onChange={setColor} />
      </div>

      {/* Status + Dates row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-2xs font-semibold text-gray-400 uppercase tracking-wider">Status</label>
          <select
            value={isActive ? 'active' : 'inactive'}
            onChange={(e) => setIsActive(e.target.value === 'active')}
            className="h-8 px-2 text-xs border border-gray-300 rounded-md bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-meridian-500"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-2xs font-semibold text-gray-400 uppercase tracking-wider">Start date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-8 px-2.5 rounded-md border border-gray-300 text-xs text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-meridian-500 hover:border-gray-400"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-2xs font-semibold text-gray-400 uppercase tracking-wider">End date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-8 px-2.5 rounded-md border border-gray-300 text-xs text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-meridian-500 hover:border-gray-400"
          />
        </div>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex items-center justify-between pt-1 border-t border-gray-100">
        {/* Delete */}
        {!confirmDel
          ? (
            <button
              type="button"
              onClick={() => setConfirmDel(true)}
              className="flex items-center gap-1.5 h-8 px-3 text-xs text-red-500 border border-red-200 rounded-md hover:bg-red-50 transition-colors"
            >
              <Trash2 size={12} /> Archive meridian
            </button>
          )
          : (
            <div className="flex items-center gap-2">
              <AlertTriangle size={13} className="text-red-500 shrink-0" />
              <span className="text-xs text-red-600">This will hide the meridian from all members.</span>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="h-7 px-2.5 text-xs font-medium bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-40 transition-colors shrink-0"
              >
                {deleting ? 'Archiving…' : 'Confirm'}
              </button>
              <button type="button" onClick={() => setConfirmDel(false)} className="text-xs text-gray-400 hover:text-gray-600">
                Cancel
              </button>
            </div>
          )
        }

        <button
          type="submit"
          disabled={!isDirty || saving || !name.trim()}
          className="h-8 px-3.5 text-xs font-medium bg-meridian-600 text-white rounded-md hover:bg-meridian-700 disabled:opacity-40 transition-colors"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  )
}

// ── StatusesTab ───────────────────────────────────────────────────────────────

function StatusRow({ status, onUpdate, onDelete, isOnly }) {
  const [editing,  setEditing]  = useState(false)
  const [name,     setName]     = useState(status.name)
  const [color,    setColor]    = useState(status.color)
  const [saving,   setSaving]   = useState(false)

  async function save() {
    if (!name.trim() || (name === status.name && color === status.color)) {
      setEditing(false)
      return
    }
    setSaving(true)
    try {
      await api.patch(`/api/statuses/${status.id}`, { name: name.trim(), color })
      onUpdate(status.id, { name: name.trim(), color })
      setEditing(false)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  async function toggleFlag(flag) {
    const newVal = !status[flag]
    onUpdate(status.id, { [flag]: newVal })
    try {
      await api.patch(`/api/statuses/${status.id}`, { [flag]: newVal })
    } catch (err) {
      console.error(err)
      onUpdate(status.id, { [flag]: !newVal }) // revert
    }
  }

  return (
    <div className="flex items-center gap-2 py-2 px-2 rounded-lg hover:bg-gray-50 group/row">
      <GripVertical size={14} className="text-gray-300 shrink-0 cursor-grab" />

      {/* Color dot / picker */}
      <div className="relative shrink-0">
        <input
          type="color"
          value={color}
          onChange={(e) => { setColor(e.target.value); setEditing(true) }}
          className="w-5 h-5 rounded-full cursor-pointer border-0 p-0 bg-transparent opacity-0 absolute inset-0"
          title="Change colour"
        />
        <span className="w-5 h-5 rounded-full block border border-gray-200" style={{ backgroundColor: color }} />
      </div>

      {/* Name */}
      {editing
        ? (
          <input
            type="text"
            value={name}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            onBlur={save}
            onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setEditing(false); setName(status.name); setColor(status.color) } }}
            className="flex-1 h-7 px-2 text-sm border border-meridian-400 rounded focus:outline-none focus:ring-1 focus:ring-meridian-400"
          />
        )
        : (
          <span
            className="flex-1 text-sm text-gray-700 cursor-text"
            onClick={() => setEditing(true)}
          >
            {status.name}
          </span>
        )
      }

      {/* Flag pills */}
      <div className="flex gap-1 shrink-0">
        {[
          { key: 'isDefault',  label: 'Default',  activeClass: 'bg-blue-100 text-blue-700 border-blue-200'   },
          { key: 'isComplete', label: 'Complete',  activeClass: 'bg-teal-100 text-teal-700 border-teal-200'   },
          { key: 'isBlocked',  label: 'Blocked',   activeClass: 'bg-amber-100 text-amber-700 border-amber-200' },
        ].map(({ key, label, activeClass }) => (
          <button
            key={key}
            type="button"
            onClick={() => toggleFlag(key)}
            className={`text-2xs px-1.5 py-0.5 rounded border transition-colors ${
              status[key]
                ? activeClass
                : 'bg-gray-50 text-gray-400 border-gray-200 hover:border-gray-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Delete */}
      <button
        type="button"
        disabled={isOnly || (status.isDefault && true /* extra guard in API */)}
        onClick={() => onDelete(status.id)}
        title="Delete status"
        className="p-1 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 disabled:opacity-20 disabled:cursor-not-allowed transition-colors shrink-0 opacity-0 group-hover/row:opacity-100"
      >
        <Trash2 size={13} />
      </button>
    </div>
  )
}

function StatusesTab({ meridian, statuses: initialStatuses, onStatusesChanged }) {
  const [statuses, setStatuses] = useState(initialStatuses)
  const [addName,  setAddName]  = useState('')
  const [addColor, setAddColor] = useState('#94A3B8')
  const [adding,   setAdding]   = useState(false)
  const [addError, setAddError] = useState(null)

  function handleUpdate(id, patch) {
    setStatuses((prev) => prev.map((s) => s.id === id ? { ...s, ...patch } : s))
    onStatusesChanged?.()
  }

  async function handleDelete(id) {
    const prev = statuses
    setStatuses((s) => s.filter((x) => x.id !== id))
    try {
      const result = await api.delete(`/api/statuses/${id}`)
      if (result?.reassignedTo) onStatusesChanged?.()
    } catch (err) {
      console.error(err)
      setStatuses(prev)
    }
  }

  async function handleAdd(e) {
    e.preventDefault()
    if (!addName.trim()) return
    setAdding(true)
    setAddError(null)
    try {
      const created = await api.post(`/api/meridians/${meridian.id}/statuses`, {
        name: addName.trim(), color: addColor,
      })
      setStatuses((prev) => [...prev, created])
      setAddName('')
      setAddColor('#94A3B8')
      onStatusesChanged?.()
    } catch (err) {
      setAddError(err.message)
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-0.5">
        {statuses.map((s) => (
          <StatusRow
            key={s.id}
            status={s}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            isOnly={statuses.length <= 1}
          />
        ))}
      </div>

      {/* Add new */}
      <form onSubmit={handleAdd} className="flex items-center gap-2 pt-2 border-t border-gray-100">
        <input
          type="color"
          value={addColor}
          onChange={(e) => setAddColor(e.target.value)}
          className="w-6 h-6 rounded-full cursor-pointer border-0 p-0 bg-transparent shrink-0"
          title="Pick colour"
        />
        <input
          type="text"
          value={addName}
          onChange={(e) => setAddName(e.target.value)}
          placeholder="New status name…"
          className="flex-1 h-8 px-2.5 rounded-md border border-gray-300 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-meridian-500 hover:border-gray-400"
        />
        <button
          type="submit"
          disabled={!addName.trim() || adding}
          className="h-8 px-3 text-xs font-medium bg-meridian-600 text-white rounded-md hover:bg-meridian-700 disabled:opacity-40 transition-colors shrink-0"
        >
          <Plus size={13} />
        </button>
      </form>
      {addError && <p className="text-xs text-red-600">{addError}</p>}
    </div>
  )
}

// ── MembersTab ────────────────────────────────────────────────────────────────

function MembersTab({ meridian, myUserId, allUsers = [], onLeft }) {
  const [members,        setMembers]        = useState([])
  const [membersLoading, setMembersLoading] = useState(true)
  const [error,          setError]          = useState(null)

  // Add-member state
  const [searchQuery,    setSearchQuery]    = useState('')
  const [dropdownOpen,   setDropdownOpen]   = useState(false)
  const [selectedUser,   setSelectedUser]   = useState(null)  // { id, displayName, email }
  const [addRole,        setAddRole]        = useState('member')
  const [adding,         setAdding]         = useState(false)
  const [addError,       setAddError]       = useState(null)
  const searchRef = useRef(null)

  useEffect(() => {
    api.get(`/api/meridians/${meridian.id}/members`)
      .then(setMembers)
      .catch((e) => setError(e.message))
      .finally(() => setMembersLoading(false))
  }, [meridian.id])

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) setDropdownOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const ownerCount = members.filter((m) => m.role === 'owner').length

  // Users not already in this meridian, filtered by the search query
  const memberUserIds = new Set(members.map((m) => m.userId))
  const searchResults = allUsers
    .filter((u) => !memberUserIds.has(u.id))
    .filter((u) => {
      if (!searchQuery) return true
      const q = searchQuery.toLowerCase()
      return u.displayName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    })
    .slice(0, 8)

  function handleSelectUser(u) {
    setSelectedUser(u)
    setSearchQuery(u.displayName)
    setDropdownOpen(false)
    setAddError(null)
  }

  async function handleAdd() {
    if (!selectedUser || adding) return
    setAdding(true)
    setAddError(null)
    try {
      const added = await api.post(`/api/meridians/${meridian.id}/members`, {
        userId: selectedUser.id,
        role:   addRole,
      })
      setMembers((prev) => [...prev, added])
      setSelectedUser(null)
      setSearchQuery('')
      setAddRole('member')
    } catch (err) {
      setAddError(err.message)
    } finally {
      setAdding(false)
    }
  }

  async function handleRoleChange(targetUserId, newRole) {
    const prev = members
    setMembers((ms) => ms.map((m) => m.userId === targetUserId ? { ...m, role: newRole } : m))
    try {
      await api.patch(`/api/meridians/${meridian.id}/members/${targetUserId}`, { role: newRole })
    } catch (err) {
      setError(err.message)
      setMembers(prev)
    }
  }

  async function handleRemove(targetUserId) {
    const isSelf = targetUserId === myUserId
    const prev   = members
    setMembers((ms) => ms.filter((m) => m.userId !== targetUserId))
    try {
      await api.delete(`/api/meridians/${meridian.id}/members/${targetUserId}`)
      if (isSelf) onLeft?.()
    } catch (err) {
      setError(err.message)
      setMembers(prev)
    }
  }

  if (membersLoading) return <p className="text-sm text-gray-400 text-center py-8">Loading…</p>

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="text-xs text-red-600">{error}</p>}

      {/* Existing members */}
      <div className="flex flex-col gap-0.5">
        {members.map((m) => {
          const isMe        = m.userId === myUserId
          const isLastOwner = m.role === 'owner' && ownerCount <= 1
          return (
            <div key={m.userId} className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-gray-50">
              <Avatar user={{ displayName: m.displayName }} size={30} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-800 truncate">
                  {m.displayName}
                  {isMe && <span className="ml-1.5 text-2xs text-gray-400 font-normal">you</span>}
                </div>
                <div className="text-2xs text-gray-400 truncate">{m.email}</div>
              </div>
              <select
                value={m.role}
                disabled={isLastOwner}
                onChange={(e) => handleRoleChange(m.userId, e.target.value)}
                className="text-xs border border-gray-200 rounded px-1.5 py-1 text-gray-700 bg-white disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-meridian-400"
              >
                <option value="owner">Owner</option>
                <option value="member">Member</option>
                <option value="viewer">Viewer</option>
              </select>
              <button
                type="button"
                disabled={isLastOwner}
                onClick={() => handleRemove(m.userId)}
                title={isMe ? 'Leave meridian' : 'Remove member'}
                className="p-1.5 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
              >
                <UserMinus size={14} />
              </button>
            </div>
          )
        })}
      </div>

      {/* Add member — only shown when there are non-members to add */}
      {allUsers.some((u) => !memberUserIds.has(u.id)) && (
        <div className="pt-3 border-t border-gray-100">
          <div className="text-2xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Add member</div>
          <div className="flex gap-2">

            {/* Search input + dropdown */}
            <div ref={searchRef} className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setSelectedUser(null)
                  setDropdownOpen(true)
                }}
                onFocus={() => setDropdownOpen(true)}
                placeholder="Search by name or email…"
                className="w-full h-8 px-2.5 text-xs border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-meridian-500 hover:border-gray-400"
              />

              {dropdownOpen && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 max-h-48 overflow-y-auto">
                  {searchResults.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); handleSelectUser(u) }}
                      className="flex items-center gap-2.5 w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors"
                    >
                      <Avatar user={u} size={22} />
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-gray-800 truncate">{u.displayName}</div>
                        <div className="text-2xs text-gray-400 truncate">{u.email}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Role picker */}
            <select
              value={addRole}
              onChange={(e) => setAddRole(e.target.value)}
              className="h-8 px-2 text-xs border border-gray-300 rounded-md bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-meridian-500 shrink-0"
            >
              <option value="member">Member</option>
              <option value="viewer">Viewer</option>
              <option value="owner">Owner</option>
            </select>

            {/* Add button */}
            <button
              type="button"
              onClick={handleAdd}
              disabled={!selectedUser || adding}
              className="h-8 px-3 text-xs font-medium bg-meridian-600 text-white rounded-md hover:bg-meridian-700 disabled:opacity-40 transition-colors shrink-0"
            >
              {adding ? '…' : 'Add'}
            </button>
          </div>

          {addError && <p className="text-xs text-red-600 mt-1.5">{addError}</p>}
        </div>
      )}
    </div>
  )
}

// ── InvitationsTab ────────────────────────────────────────────────────────────

function InvitationsTab({ meridian }) {
  const [invitations,        setInvitations]        = useState([])
  const [invitationsLoading, setInvitationsLoading] = useState(true)
  const [inviteRole,         setInviteRole]          = useState('member')
  const [inviteEmail,        setInviteEmail]         = useState('')
  const [inviteTtl,          setInviteTtl]           = useState(72)
  const [inviteCreating,     setInviteCreating]      = useState(false)
  const [inviteError,        setInviteError]         = useState(null)
  const [copied,             setCopied]              = useState(null)

  useEffect(() => {
    api.get(`/api/meridians/${meridian.id}/invitations`)
      .then(setInvitations)
      .catch(console.error)
      .finally(() => setInvitationsLoading(false))
  }, [meridian.id])

  async function handleCreate(e) {
    e.preventDefault()
    setInviteCreating(true)
    setInviteError(null)
    try {
      const created = await api.post(`/api/meridians/${meridian.id}/invitations`, {
        role: inviteRole, email: inviteEmail.trim() || null, ttlHours: inviteTtl,
      })
      setInvitations((prev) => [{ ...created, createdByName: 'You' }, ...prev])
      setInviteEmail('')
    } catch (err) {
      setInviteError(err.message)
    } finally {
      setInviteCreating(false)
    }
  }

  async function handleRevoke(token) {
    const prev = invitations
    setInvitations((is) => is.filter((i) => i.token !== token))
    try { await api.delete(`/api/invitations/${token}`) }
    catch { setInvitations(prev) }
  }

  function copyLink(token) {
    navigator.clipboard.writeText(`${window.location.origin}?invite=${token}`).catch(console.error)
    setCopied(token)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Create form */}
      <form onSubmit={handleCreate} className="flex flex-col gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">New invite link</div>
        <div className="flex gap-3">
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-2xs text-gray-400 font-semibold uppercase tracking-wider">Role</label>
            <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}
              className="h-8 px-2 text-xs border border-gray-300 rounded-md bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-meridian-500">
              <option value="member">Member</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-2xs text-gray-400 font-semibold uppercase tracking-wider">Expires</label>
            <select value={inviteTtl} onChange={(e) => setInviteTtl(Number(e.target.value))}
              className="h-8 px-2 text-xs border border-gray-300 rounded-md bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-meridian-500">
              {TTL_OPTIONS.map((o) => <option key={o.hours} value={o.hours}>{o.label}</option>)}
            </select>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-2xs text-gray-400 font-semibold uppercase tracking-wider">
            Email <span className="normal-case font-normal text-gray-300">(optional — leave blank for an open link)</span>
          </label>
          <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="colleague@example.com"
            className="h-8 px-2.5 text-xs border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-meridian-500" />
        </div>
        {inviteError && <p className="text-xs text-red-600">{inviteError}</p>}
        <div className="flex justify-end">
          <button type="submit" disabled={inviteCreating}
            className="h-8 px-3.5 text-xs font-medium bg-meridian-600 text-white rounded-md hover:bg-meridian-700 disabled:opacity-40 transition-colors">
            {inviteCreating ? 'Creating…' : 'Create link'}
          </button>
        </div>
      </form>

      {/* Pending */}
      {invitationsLoading
        ? <p className="text-sm text-gray-400 text-center py-4">Loading…</p>
        : invitations.length === 0
          ? <p className="text-sm text-gray-400 text-center py-2 italic">No pending invitations</p>
          : (
            <div className="flex flex-col gap-0.5">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Pending</div>
              {invitations.map((inv) => (
                <div key={inv.token} className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-gray-50">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-700 truncate">
                      {inv.email ?? <span className="italic text-gray-400">Open link</span>}
                    </div>
                    <div className="text-2xs text-gray-400">
                      {ROLE_LABELS[inv.role]} · Expires {new Date(inv.expiresAt).toLocaleDateString()}
                    </div>
                  </div>
                  <button type="button" onClick={() => copyLink(inv.token)} title="Copy link"
                    className="p-1.5 rounded text-gray-400 hover:text-meridian-600 hover:bg-meridian-50 transition-colors shrink-0">
                    {copied === inv.token ? <Check size={13} className="text-teal-500" /> : <Copy size={13} />}
                  </button>
                  <button type="button" onClick={() => handleRevoke(inv.token)} title="Revoke"
                    className="p-1.5 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )
      }
    </div>
  )
}

// ── MeridianSettingsModal (shell) ─────────────────────────────────────────────

export default function MeridianSettingsModal({ meridian: initialMeridian, myUserId, statuses, allUsers = [], onClose, onSaved, onDeleted, onLeft, onStatusesChanged }) {
  const [tab,      setTab]      = useState('general')
  const [meridian, setMeridian] = useState(initialMeridian)

  function handleSaved(updated) {
    setMeridian(updated)
    onSaved?.(updated)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px]"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-xl mx-4 flex flex-col max-h-[86vh]">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 pt-5 pb-3 shrink-0">
          <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: meridian.color }} />
          <h2 className="font-semibold text-gray-900 flex-1 truncate">{meridian.name}</h2>
          <button type="button" onClick={onClose}
            className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors shrink-0">
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-5 border-b border-gray-200 shrink-0">
          {TABS.map((t) => (
            <button key={t} type="button" onClick={() => setTab(t)}
              className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors capitalize ${
                tab === t
                  ? 'border-meridian-500 text-meridian-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              {t}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'general' && (
            <GeneralTab
              meridian={meridian}
              onSaved={handleSaved}
              onDeleted={onDeleted}
            />
          )}
          {tab === 'statuses' && (
            <StatusesTab
              meridian={meridian}
              statuses={statuses.filter((s) => s.meridianId === meridian.id)}
              onStatusesChanged={onStatusesChanged}
            />
          )}
          {tab === 'members' && (
            <MembersTab
              meridian={meridian}
              myUserId={myUserId}
              allUsers={allUsers}
              onLeft={onLeft}
            />
          )}
          {tab === 'invitations' && (
            <InvitationsTab meridian={meridian} />
          )}
        </div>
      </div>
    </div>
  )
}
