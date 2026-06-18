import { useState } from 'react'
import EmptyState from './EmptyState.jsx'
import ScoreBadge from './ScoreBadge.jsx'
import { Sparkles } from './Icons.jsx'
import { getScore, maxScore, scoreTier, sortPlays } from '../lib/scoring.js'
import { runComparison } from '../lib/anthropic.js'
import { useToast } from './Toast.jsx'

function castText(p) {
  if (p.castMin && p.castMax) return `${p.castMin}–${p.castMax}`
  if (p.castMin) return `${p.castMin}+`
  if (p.castMax) return `up to ${p.castMax}`
  return '—'
}

export default function Compare({ plays, settings }) {
  const toast = useToast()
  const [selectedIds, setSelectedIds] = useState([])
  const [ai, setAi] = useState({ status: 'idle', text: '' })

  const max = maxScore(settings)
  const hasKey = Boolean(settings.apiKey?.trim())
  const ranked = sortPlays(plays, 'score', 'desc')
  const selected = ranked.filter((p) => selectedIds.includes(p.id))
  const topScore = selected.length ? Math.max(...selected.map((p) => getScore(p))) : null

  function toggle(id) {
    setAi({ status: 'idle', text: '' })
    setSelectedIds((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
    )
  }

  async function generate() {
    setAi({ status: 'busy', text: '' })
    try {
      const text = await runComparison(selected, settings)
      setAi({ status: 'done', text })
      toast('Comparison generated', 'success')
    } catch (err) {
      console.error('[compare] failed', err)
      setAi({ status: 'idle', text: '' })
      toast(err.message, 'error')
    }
  }

  if (plays.length === 0) {
    return (
      <div>
        <h2 className="mb-4 text-xl font-bold text-slate-800">Compare</h2>
        <EmptyState
          title="No plays to compare"
          message="Add plays (and run research on them) first. Then pick two or more here to compare their scores and research side by side."
        />
      </div>
    )
  }

  const researchRows = [
    ['Research — Summary', 'summary'],
    ['Licensing & Royalties', 'licensing'],
    ['Production History', 'productionHistory'],
    ['Audience Reception', 'audienceReception'],
    ['Complexity & Budget', 'complexity'],
  ]

  return (
    <div>
      <h2 className="mb-4 text-xl font-bold text-slate-800">Compare Plays</h2>

      {/* Selector */}
      <div className="card mb-6 p-4">
        <p className="mb-3 text-sm font-medium text-slate-700">
          Select plays to compare {selected.length > 0 && `(${selected.length} selected)`}
        </p>
        <div className="flex flex-wrap gap-2">
          {ranked.map((p) => {
            const on = selectedIds.includes(p.id)
            return (
              <button
                key={p.id}
                onClick={() => toggle(p.id)}
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  on
                    ? 'border-primary bg-primary text-white'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="max-w-[12rem] truncate">{p.title || '(untitled)'}</span>
                <span className={on ? 'text-white/80' : 'text-slate-400'}>{getScore(p)}</span>
              </button>
            )
          })}
        </div>
      </div>

      {selected.length < 2 ? (
        <EmptyState
          title="Pick at least two plays"
          message="Tap plays above to add them to the comparison. They'll line up side by side across scores and research."
        />
      ) : (
        <>
          {/* AI compare & contrast */}
          <div className="card mb-6 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-800">AI Compare &amp; Contrast</h3>
                <p className="text-sm text-slate-500">
                  Generate a board-ready recommendation from the selected plays' scores and research.
                </p>
              </div>
              <button
                className="btn-accent"
                onClick={generate}
                disabled={!hasKey || ai.status === 'busy'}
              >
                {ai.status === 'busy' ? (
                  <>
                    <Spinner /> Generating…
                  </>
                ) : (
                  <>
                    <Sparkles /> Generate Comparison
                  </>
                )}
              </button>
            </div>
            {!hasKey && (
              <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Add your Anthropic API key in Settings to use AI comparison.
              </p>
            )}
            {ai.status === 'done' && (
              <div className="mt-4 whitespace-pre-line rounded-lg border border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-700">
                {ai.text}
              </div>
            )}
          </div>

          {/* Side-by-side table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50">
                  <th className="sticky left-0 z-10 w-40 bg-slate-50 px-4 py-3 text-left font-semibold text-slate-600">
                    &nbsp;
                  </th>
                  {selected.map((p) => (
                    <th
                      key={p.id}
                      className="min-w-[16rem] border-l border-slate-200 px-4 py-3 text-left align-top"
                    >
                      <div className="font-semibold text-slate-800">{p.title || '(untitled)'}</div>
                      <div className="text-xs font-normal text-slate-500">{p.playwright || '—'}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <Row label="Score">
                  {selected.map((p) => (
                    <Cell key={p.id} highlight={getScore(p) === topScore}>
                      <ScoreBadge tier={scoreTier(p, settings)}>{getScore(p)}</ScoreBadge>
                      <span className="ml-1 text-slate-400">/ {max}</span>
                    </Cell>
                  ))}
                </Row>
                <Row label="Genre">
                  {selected.map((p) => (
                    <Cell key={p.id}>{p.genre || '—'}</Cell>
                  ))}
                </Row>
                <Row label="Cast size">
                  {selected.map((p) => (
                    <Cell key={p.id}>{castText(p)}</Cell>
                  ))}
                </Row>
                <Row label="Runtime">
                  {selected.map((p) => (
                    <Cell key={p.id}>{p.runtime ? `${p.runtime} min` : '—'}</Cell>
                  ))}
                </Row>
                {researchRows.map(([label, key]) => (
                  <Row key={key} label={label}>
                    {selected.map((p) => (
                      <Cell key={p.id} muted>
                        {p.research?.[key] ? (
                          <span className="whitespace-pre-line text-slate-700">{p.research[key]}</span>
                        ) : p.research ? (
                          '—'
                        ) : (
                          <span className="italic text-slate-400">No research yet</span>
                        )}
                      </Cell>
                    ))}
                  </Row>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

function Row({ label, children }) {
  return (
    <tr className="border-t border-slate-100 align-top">
      <td className="sticky left-0 z-10 bg-white px-4 py-3 font-medium text-slate-600">{label}</td>
      {children}
    </tr>
  )
}

function Cell({ children, highlight, muted }) {
  return (
    <td
      className={`border-l border-slate-100 px-4 py-3 align-top ${
        highlight ? 'bg-green-50' : ''
      } ${muted ? 'text-slate-700' : 'text-slate-800'}`}
    >
      {children}
    </td>
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
