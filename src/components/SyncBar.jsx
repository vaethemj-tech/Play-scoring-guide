import { useEffect, useState } from 'react'

function relTime(iso) {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.max(0, Math.round(diff / 1000))
  if (s < 10) return 'just now'
  if (s < 60) return `${s}s ago`
  const m = Math.round(s / 60)
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  return `${h} hr ago`
}

const DOT = {
  synced: 'bg-green-500',
  connecting: 'bg-amber-400',
  error: 'bg-red-500',
  off: 'bg-slate-300',
}

export default function SyncBar({ status, online, boardUpdatedAt, onSyncNow, memberId }) {
  // Re-render periodically so the relative timestamp stays current.
  const [, force] = useState(0)
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 15000)
    return () => clearInterval(id)
  }, [])

  const names = (online || []).map((o) => (o.memberId === memberId ? 'You' : o.name))
  const onlineLabel =
    names.length === 0
      ? 'Connecting…'
      : names.length === 1
        ? names[0] === 'You'
          ? 'Only you online'
          : `${names[0]} online`
        : `${names.length} online: ${names.join(', ')}`

  return (
    <div className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 text-xs text-slate-500">
        <span className="flex items-center gap-1.5 font-medium text-slate-600">
          <span className={`h-2 w-2 rounded-full ${DOT[status] || DOT.off}`} />
          {status === 'error' ? 'Sync error' : status === 'connecting' ? 'Syncing…' : 'Team sync on'}
        </span>
        <span className="flex items-center gap-1">
          <span aria-hidden>👥</span> {onlineLabel}
        </span>
        <span className="hidden sm:inline">Board updated {relTime(boardUpdatedAt)}</span>
        <button
          onClick={onSyncNow}
          disabled={status === 'connecting'}
          className="ml-auto inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <span aria-hidden>⟳</span> Sync now
        </button>
      </div>
    </div>
  )
}
