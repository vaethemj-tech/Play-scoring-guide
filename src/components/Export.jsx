import { useState } from 'react'
import EmptyState from './EmptyState.jsx'
import ScoreBadge from './ScoreBadge.jsx'
import { Download } from './Icons.jsx'
import { sortByMetric, combinedScore, combinedTier } from '../lib/scoring.js'
import { generateReport } from '../lib/pdf.js'
import { useToast } from './Toast.jsx'

const MODES = [
  { id: 'all', label: 'All plays' },
  { id: 'top', label: 'Top N by rank' },
  { id: 'pick', label: 'Choose specific shows' },
]

export default function Export({ plays, settings }) {
  const toast = useToast()
  const [mode, setMode] = useState('all')
  const [topN, setTopN] = useState(10)
  const [selectedIds, setSelectedIds] = useState([])

  const ranked = sortByMetric(plays, settings, 'combined', 'desc')

  // The plays that will actually go into the PDF, in ranked order.
  function chosenPlays() {
    if (mode === 'top') return ranked.slice(0, Math.max(1, Number(topN) || 1))
    if (mode === 'pick') return ranked.filter((p) => selectedIds.includes(p.id))
    return ranked
  }

  function toggle(id) {
    setSelectedIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))
  }

  function handleGenerate() {
    const chosen = chosenPlays()
    if (chosen.length === 0) {
      toast('Select at least one show to include.', 'error')
      return
    }
    try {
      generateReport(chosen, settings, { topN: null })
      toast(`Report generated (${chosen.length} play${chosen.length === 1 ? '' : 's'})`, 'success')
    } catch (err) {
      toast(`Could not generate report: ${err.message}`, 'error')
    }
  }

  if (plays.length === 0) {
    return (
      <div>
        <h2 className="mb-4 text-xl font-bold text-slate-800">Export</h2>
        <EmptyState
          title="Nothing to export yet"
          message="Add plays and score them, then generate a board-ready PDF report here."
        />
      </div>
    )
  }

  const researched = plays.filter((p) => p.researchedAt).length
  const count = chosenPlays().length

  return (
    <div className="mx-auto max-w-2xl">
      <h2 className="mb-4 text-xl font-bold text-slate-800">Export Board Report</h2>

      <div className="card p-6">
        <p className="text-sm text-slate-600">
          Generate a professionally formatted PDF for your board. It includes a cover page with your
          theater name and date, a ranked play list, a scoring breakdown per play, and the saved
          market research for each play.
        </p>

        <dl className="mt-5 grid grid-cols-3 gap-3 text-center">
          <div className="rounded-lg bg-slate-50 p-3">
            <dt className="text-xs text-slate-400">Plays</dt>
            <dd className="text-lg font-bold text-primary">{plays.length}</dd>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <dt className="text-xs text-slate-400">Researched</dt>
            <dd className="text-lg font-bold text-primary">{researched}</dd>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <dt className="text-xs text-slate-400">In report</dt>
            <dd className="text-lg font-bold text-primary">{count}</dd>
          </div>
        </dl>

        {!settings.theaterName && (
          <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Tip: set your theater name in <strong>Settings</strong> so it appears on the cover page.
          </p>
        )}

        {/* Which plays to include */}
        <div className="mt-5">
          <p className="mb-2 text-sm font-medium text-slate-700">Which shows to include</p>
          <div className="inline-flex flex-wrap overflow-hidden rounded-md border border-slate-300">
            {MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  mode === m.id ? 'bg-primary text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {mode === 'top' && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-slate-200 p-4">
            <span className="text-sm font-medium text-slate-700">Include the top</span>
            <input
              type="number"
              min="1"
              max={plays.length}
              value={topN}
              onChange={(e) => setTopN(e.target.value)}
              className="w-20 rounded-md border border-slate-300 px-2 py-1 text-sm"
            />
            <span className="text-sm text-slate-500">plays by combined rank</span>
          </div>
        )}

        {mode === 'pick' && (
          <div className="mt-4 rounded-lg border border-slate-200 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm text-slate-500">{selectedIds.length} selected</span>
              <div className="flex gap-3 text-sm font-medium">
                <button
                  className="text-accent hover:text-primary"
                  onClick={() => setSelectedIds(ranked.map((p) => p.id))}
                >
                  Select all
                </button>
                <button
                  className="text-slate-500 hover:text-slate-700"
                  onClick={() => setSelectedIds([])}
                >
                  Clear
                </button>
              </div>
            </div>
            <ul className="max-h-80 space-y-1 overflow-y-auto">
              {ranked.map((p) => {
                const on = selectedIds.includes(p.id)
                return (
                  <li key={p.id}>
                    <label
                      className={`flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 ${
                        on ? 'border-accent bg-accent/5' : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-accent"
                        checked={on}
                        onChange={() => toggle(p.id)}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-slate-800">
                          {p.title || '(untitled)'}
                        </span>
                        <span className="block truncate text-xs text-slate-500">
                          {[p.playwright, p.genre].filter(Boolean).join(' • ') || '—'}
                        </span>
                      </span>
                      <ScoreBadge tier={combinedTier(combinedScore(p, settings))}>
                        {Math.round(combinedScore(p, settings))}
                      </ScoreBadge>
                    </label>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        <button className="btn-primary mt-6 w-full" onClick={handleGenerate}>
          <Download /> Generate PDF Report ({count} {count === 1 ? 'play' : 'plays'})
        </button>
      </div>
    </div>
  )
}
