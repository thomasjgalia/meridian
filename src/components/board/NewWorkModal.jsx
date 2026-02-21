import { useState, useMemo } from 'react'
import { X, ChevronRight } from 'lucide-react'
import { IconEpisode, IconSignal, IconRelay } from '../icons'

// ── Type metadata ─────────────────────────────────────────────────────────────

const TYPES = [
  { value: 'episode', label: 'Episode', Icon: IconEpisode, color: 'text-indigo-600', desc: 'A chapter of work within an Arc' },
  { value: 'signal',  label: 'Signal',  Icon: IconSignal,  color: 'text-teal-500',   desc: 'A user story or feature within an Episode' },
  { value: 'relay',   label: 'Relay',   Icon: IconRelay,   color: 'text-orange-500', desc: 'A concrete task within a Signal' },
]

// ── Select field ──────────────────────────────────────────────────────────────

function SelectField({ label, value, onChange, options, placeholder, disabled }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-2xs font-semibold text-gray-400 uppercase tracking-wider">
        {label}
      </label>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        disabled={disabled}
        className={`
          h-8 px-2.5 rounded-md border text-sm text-gray-800 bg-white
          focus:outline-none focus:ring-2 focus:ring-meridian-500 focus:border-transparent
          ${disabled ? 'opacity-40 cursor-not-allowed border-gray-200' : 'border-gray-300 hover:border-gray-400'}
        `}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>{o.name ?? o.title}</option>
        ))}
      </select>
    </div>
  )
}

// ── Main modal ────────────────────────────────────────────────────────────────

export default function NewWorkModal({ items, statuses, onAdd, onClose }) {
  const [type,    setType]    = useState('episode')
  const [title,   setTitle]   = useState('')
  const [arcId,   setArcId]   = useState(null)
  const [episodeId,  setEpisodeId]  = useState(null)
  const [signalId,   setSignalId]   = useState(null)

  // Cascading option lists derived from items
  const arcs     = useMemo(() => items.filter((i) => i.type === 'arc'),     [items])
  const episodes = useMemo(
    () => items.filter((i) => i.type === 'episode' && (!arcId || i.parentId === arcId)),
    [items, arcId]
  )
  const signals  = useMemo(
    () => items.filter((i) => i.type === 'signal' && (!episodeId || i.parentId === episodeId)),
    [items, episodeId]
  )

  // When type changes, reset downstream selections
  function selectType(t) {
    setType(t)
    setArcId(null)
    setEpisodeId(null)
    setSignalId(null)
  }

  // Reset episode/signal when arc changes
  function selectArc(id) {
    setArcId(id)
    setEpisodeId(null)
    setSignalId(null)
    // infer meridianId from the chosen arc
    const arc = items.find((i) => i.id === id)
    if (arc) setMeridianId(arc.meridianId)
  }

  function selectEpisode(id) {
    setEpisodeId(id)
    setSignalId(null)
  }

  // ── Derived parent / meridian for the new item ────────────────────────────
  const { parentId, resolvedMeridianId } = useMemo(() => {
    if (type === 'episode') {
      const arc = items.find((i) => i.id === arcId)
      return { parentId: arcId, resolvedMeridianId: arc?.meridianId ?? null }
    }
    if (type === 'signal') {
      const ep = items.find((i) => i.id === episodeId)
      return { parentId: episodeId, resolvedMeridianId: ep?.meridianId ?? null }
    }
    // relay
    const sig = items.find((i) => i.id === signalId)
    return { parentId: signalId, resolvedMeridianId: sig?.meridianId ?? null }
  }, [type, meridianId, arcId, episodeId, signalId, items])

  // ── Validation ─────────────────────────────────────────────────────────────
  const isValid = useMemo(() => {
    if (!title.trim()) return false
    if (type === 'episode') return arcId !== null
    if (type === 'signal')  return episodeId !== null
    if (type === 'relay')   return signalId !== null
    return false
  }, [title, type, arcId, episodeId, signalId])

  // ── Missing-parent guidance ────────────────────────────────────────────────
  const missingParentMsg = useMemo(() => {
    if (type === 'episode' && arcs.length === 0)
      return { text: 'No Arcs exist yet. Add one from the Meridian menu first.', action: null }
    if (type === 'signal' && arcs.length === 0)
      return { text: 'No Arcs exist yet. Add one from the Meridian menu first.', action: null }
    if (type === 'signal' && arcId && episodes.length === 0)
      return { text: 'No Episodes in this Arc yet.', action: 'episode' }
    if (type === 'relay' && arcs.length === 0)
      return { text: 'No Arcs exist yet. Add one from the Meridian menu first.', action: null }
    if (type === 'relay' && arcId && episodes.length === 0)
      return { text: 'No Episodes in this Arc yet.', action: 'episode' }
    if (type === 'relay' && episodeId && signals.length === 0)
      return { text: 'No Signals in this Episode yet.', action: 'signal' }
    return null
  }, [type, arcs, arcId, episodes, episodeId, signals])

  // ── Submit ─────────────────────────────────────────────────────────────────
  function handleSubmit(e) {
    e.preventDefault()
    if (!isValid) return
    const defaultStatus = statuses.find((s) => s.isDefault) ?? statuses[0]
    const maxId = items.reduce((m, i) => Math.max(m, i.id), 0)
    const siblings = items.filter((i) => i.parentId === parentId && i.type === type)
    onAdd({
      id:          maxId + 1,
      meridianId:  resolvedMeridianId,
      parentId,
      type,
      title:       title.trim(),
      statusId:    defaultStatus.id,
      assigneeId:  null,
      sprintId:    null,
      position:    siblings.length,
      description: null,
    })
    onClose()
  }

  const typeConfig = TYPES.find((t) => t.value === type)

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px]"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">New Work Item</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-5 py-5">

          {/* Type selector */}
          <div className="flex flex-col gap-1.5">
            <span className="text-2xs font-semibold text-gray-400 uppercase tracking-wider">Type</span>
            <div className="grid grid-cols-3 gap-2">
              {TYPES.map(({ value, label, Icon, color }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => selectType(value)}
                  className={`
                    flex flex-col items-center gap-1.5 py-2.5 px-2 rounded-lg border text-xs font-medium transition-colors
                    ${type === value
                      ? 'border-meridian-400 bg-meridian-50 text-meridian-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                    }
                  `}
                >
                  <Icon size={18} className={type === value ? 'text-meridian-600' : color} />
                  {label}
                </button>
              ))}
            </div>
            {typeConfig && (
              <p className="text-2xs text-gray-400 mt-0.5">{typeConfig.desc}</p>
            )}
          </div>

          {/* Hierarchy path (visual breadcrumb) */}
          <div className="flex items-center gap-1 text-2xs text-gray-400">
              <span className="font-medium text-gray-500">Meridian</span>
              <ChevronRight size={10} className="text-gray-300" />
              <span className={type === 'arc' ? 'font-medium text-meridian-600' : ''}>Arc</span>
              {(type === 'episode' || type === 'signal' || type === 'relay') && (
                <>
                  <ChevronRight size={10} className="text-gray-300" />
                  <span className={type === 'episode' ? 'font-medium text-meridian-600' : ''}>Episode</span>
                </>
              )}
              {(type === 'signal' || type === 'relay') && (
                <>
                  <ChevronRight size={10} className="text-gray-300" />
                  <span className={type === 'signal' ? 'font-medium text-meridian-600' : ''}>Signal</span>
                </>
              )}
              {type === 'relay' && (
                <>
                  <ChevronRight size={10} className="text-gray-300" />
                  <span className="font-medium text-meridian-600">Relay</span>
                </>
              )}
            </div>

          {/* Missing parent banner */}
          {missingParentMsg && (
            <div className="flex items-center justify-between gap-3 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-700">{missingParentMsg.text}</p>
              {missingParentMsg.action && (
                <button
                  type="button"
                  onClick={() => selectType(missingParentMsg.action)}
                  className="shrink-0 text-xs font-medium text-amber-700 underline hover:text-amber-900"
                >
                  Create {missingParentMsg.action.charAt(0).toUpperCase() + missingParentMsg.action.slice(1)}
                </button>
              )}
            </div>
          )}

          {/* Episode / Signal / Relay: Arc selector */}
          {(type === 'episode' || type === 'signal' || type === 'relay') && (
            <SelectField
              label="Arc"
              value={arcId}
              onChange={selectArc}
              options={arcs.map((a) => ({ id: a.id, name: a.title }))}
              placeholder="Select arc…"
            />
          )}

          {/* Signal / Relay: Episode selector */}
          {(type === 'signal' || type === 'relay') && (
            <SelectField
              label="Episode"
              value={episodeId}
              onChange={selectEpisode}
              options={episodes.map((e) => ({ id: e.id, name: e.title }))}
              placeholder={arcId ? 'Select episode…' : 'Select an Arc first'}
              disabled={!arcId || episodes.length === 0}
            />
          )}

          {/* Relay: Signal selector */}
          {type === 'relay' && (
            <SelectField
              label="Signal"
              value={signalId}
              onChange={setSignalId}
              options={signals.map((s) => ({ id: s.id, name: s.title }))}
              placeholder={episodeId ? 'Select signal…' : 'Select an Episode first'}
              disabled={!episodeId || signals.length === 0}
            />
          )}

          {/* Title */}
          <div className="flex flex-col gap-1">
            <label className="text-2xs font-semibold text-gray-400 uppercase tracking-wider">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`Name this ${type}…`}
              autoFocus
              className="h-8 px-2.5 rounded-md border border-gray-300 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-meridian-500 focus:border-transparent hover:border-gray-400"
            />
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="h-8 px-3.5 rounded-md text-sm text-gray-600 border border-gray-300 hover:border-gray-400 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isValid}
              className="h-8 px-3.5 rounded-md text-sm font-medium bg-meridian-600 text-white hover:bg-meridian-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Create {typeConfig?.label}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
