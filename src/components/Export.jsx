import { useState } from 'react'
import EmptyState from './EmptyState.jsx'
import { Download } from './Icons.jsx'
import { sortByMetric } from '../lib/scoring.js'
import { generateReport } from '../lib/pdf.js'
import { useToast } from './Toast.jsx'

export default function Export({ plays, settings }) {
  const toast = useToast()
  const [limitTop, setLimitTop] = useState(false)
  const [topN, setTopN] = useState(10)

  function handleGenerate() {
    try {
      const ranked = sortByMetric(plays, settings, 'combined', 'desc')
      generateReport(ranked, settings, { topN: limitTop ? Number(topN) : null })
      toast('Report generated', 'success')
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
            <dt className="text-xs text-slate-400">Theater</dt>
            <dd className="truncate text-sm font-semibold text-primary" title={settings.theaterName}>
              {settings.theaterName || '—'}
            </dd>
          </div>
        </dl>

        {!settings.theaterName && (
          <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Tip: set your theater name in <strong>Settings</strong> so it appears on the cover page.
          </p>
        )}

        <div className="mt-5 rounded-lg border border-slate-200 p-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              className="h-4 w-4 accent-accent"
              checked={limitTop}
              onChange={(e) => setLimitTop(e.target.checked)}
            />
            <span className="text-sm font-medium text-slate-700">Include only the top</span>
            <input
              type="number"
              min="1"
              max={plays.length}
              value={topN}
              onChange={(e) => setTopN(e.target.value)}
              disabled={!limitTop}
              className="w-20 rounded-md border border-slate-300 px-2 py-1 text-sm disabled:opacity-50"
            />
            <span className="text-sm text-slate-500">plays by score</span>
          </label>
        </div>

        <button className="btn-primary mt-6 w-full" onClick={handleGenerate}>
          <Download /> Generate PDF Report
        </button>
      </div>
    </div>
  )
}
