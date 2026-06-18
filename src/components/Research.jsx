import { useState } from 'react'
import EmptyState from './EmptyState.jsx'
import ResearchPanel from './ResearchPanel.jsx'
import { Sparkles, ChevronDown, ChevronUp } from './Icons.jsx'
import { runResearch } from '../lib/anthropic.js'
import { useToast } from './Toast.jsx'

export default function Research({ plays, settings, onResearched }) {
  const toast = useToast()
  const [busyId, setBusyId] = useState(null) // play currently being researched
  const [batch, setBatch] = useState(null) // { done, total } during Research All
  const [expanded, setExpanded] = useState(null)

  const hasKey = Boolean(settings.apiKey?.trim())
  const anyBusy = busyId !== null || batch !== null

  async function researchOne(play) {
    setBusyId(play.id)
    try {
      const research = await runResearch(play, settings)
      onResearched(play.id, research)
      toast(`Research complete for "${play.title || 'play'}"`, 'success')
      return true
    } catch (err) {
      console.error('[research] failed for', play.title, err)
      toast(err.message, 'error')
      return false
    } finally {
      setBusyId(null)
    }
  }

  async function researchAll() {
    setBatch({ done: 0, total: plays.length })
    let done = 0
    let failures = 0
    for (const play of plays) {
      setBusyId(play.id)
      try {
        const research = await runResearch(play, settings)
        onResearched(play.id, research)
      } catch {
        failures += 1
      }
      done += 1
      setBatch({ done, total: plays.length })
    }
    setBusyId(null)
    setBatch(null)
    if (failures) {
      toast(`Research finished with ${failures} failure(s).`, 'error')
    } else {
      toast('Research complete for all plays.', 'success')
    }
  }

  if (plays.length === 0) {
    return (
      <div>
        <h2 className="mb-4 text-xl font-bold text-slate-800">Research</h2>
        <EmptyState
          title="No plays to research"
          message="Add plays first, then run AI-powered market research to surface licensing costs, production history, and audience reception."
        />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-slate-800">Research</h2>
        <button className="btn-primary" onClick={researchAll} disabled={!hasKey || anyBusy}>
          <Sparkles /> Research All
        </button>
      </div>

      {!hasKey && (
        <div className="mb-5 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Add your Anthropic API key in <strong>Settings</strong> to enable AI market research.
        </div>
      )}

      {batch && (
        <div className="mb-5 rounded-lg border border-accent/40 bg-accent/5 p-4">
          <div className="mb-2 flex items-center justify-between text-sm font-medium text-primary">
            <span>Researching all plays…</span>
            <span>
              {batch.done} / {batch.total}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${batch.total ? (batch.done / batch.total) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      <div className="space-y-2">
        {plays.map((p) => {
          const isBusy = busyId === p.id
          const isOpen = expanded === p.id
          return (
            <div key={p.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-800">
                    {p.title || '(untitled)'}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {p.researchedAt
                      ? `Last researched ${new Date(p.researchedAt).toLocaleString()}`
                      : 'Not yet researched'}
                  </p>
                </div>
                {p.research && (
                  <button
                    className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-primary"
                    onClick={() => setExpanded(isOpen ? null : p.id)}
                    title={isOpen ? 'Hide results' : 'Show results'}
                  >
                    {isOpen ? <ChevronUp /> : <ChevronDown />}
                  </button>
                )}
                <button
                  className="btn-accent"
                  onClick={() => researchOne(p)}
                  disabled={!hasKey || anyBusy}
                >
                  {isBusy ? (
                    <>
                      <Spinner /> Researching…
                    </>
                  ) : (
                    <>
                      <Sparkles /> {p.research ? 'Re-run' : 'Run Research'}
                    </>
                  )}
                </button>
              </div>

              {isOpen && p.research && (
                <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-4">
                  <ResearchPanel research={p.research} researchedAt={p.researchedAt} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.4 0 0 5.4 0 12h4z" />
    </svg>
  )
}
