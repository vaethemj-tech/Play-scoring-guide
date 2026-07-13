import { useState } from 'react'
import EmptyState from './EmptyState.jsx'
import { Sparkles } from './Icons.jsx'
import RichText from './RichText.jsx'
import { SEASON_FACTORS } from '../constants.js'
import { sortByMetric } from '../lib/scoring.js'
import { emptyMatrix, uid } from '../lib/storage.js'
import { runSeasonMatrix, runBalanceReview, runSeasonRecommendation } from '../lib/anthropic.js'
import { useToast } from './Toast.jsx'

const SLOTS = ['show1', 'show2', 'show3']
const COLUMNS = [
  { key: 'show1', label: 'Show 1' },
  { key: 'show2', label: 'Show 2' },
  { key: 'show3', label: 'Show 3' },
]

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.4 0 0 5.4 0 12h4z" />
    </svg>
  )
}

export default function SeasonMatrix({ plays, matrices, setMatrices, settings }) {
  const toast = useToast()
  const [autoBusy, setAutoBusy] = useState(false)
  const [reviewBusy, setReviewBusy] = useState(false)
  const [seedId, setSeedId] = useState('')
  const [recBusy, setRecBusy] = useState(false)
  const [activeId, setActiveId] = useState(matrices[0]?.id)

  // The option currently being edited, plus a setter scoped to it.
  const active = matrices.find((m) => m.id === activeId) || matrices[0]
  const matrix = active
  const setMatrix = (updater) =>
    setMatrices((arr) =>
      arr.map((m) =>
        m.id === active.id ? (typeof updater === 'function' ? updater(m) : updater) : m,
      ),
    )

  function addOption() {
    const m = emptyMatrix(`Option ${String.fromCharCode(65 + matrices.length)}`)
    setMatrices((arr) => [...arr, m])
    setActiveId(m.id)
  }

  function duplicateOption() {
    const copy = { ...structuredClone(active), id: uid(), name: `${active.name || 'Option'} (copy)` }
    setMatrices((arr) => [...arr, copy])
    setActiveId(copy.id)
    toast('Option duplicated', 'success')
  }

  function deleteOption() {
    if (matrices.length <= 1) {
      toast('Keep at least one season option.', 'error')
      return
    }
    if (!confirm(`Delete "${active.name}"?`)) return
    const nextId = matrices.find((m) => m.id !== active.id)?.id
    setMatrices((arr) => arr.filter((m) => m.id !== active.id))
    setActiveId(nextId)
  }

  const hasKey = Boolean(settings.apiKey?.trim())
  const ranked = sortByMetric(plays, settings, 'combined', 'desc')
  const shows = SLOTS.map((_, i) => plays.find((p) => p.id === matrix.shows[i]) || null)

  function setShow(slotIndex, playId) {
    setMatrix((m) => {
      const next = { ...m, shows: [...m.shows] }
      next.shows[slotIndex] = playId || null
      return next
    })
  }

  function setCell(factorId, slot, value) {
    setMatrix((m) => ({
      ...m,
      values: {
        ...m.values,
        [factorId]: { ...m.values[factorId], [slot]: value },
      },
    }))
  }

  function clearGrid() {
    if (!confirm('Clear all values in the matrix? (Show selections are kept.)')) return
    setMatrix((m) => {
      const values = {}
      SEASON_FACTORS.forEach((f) => {
        values[f.id] = { show1: '', show2: '', show3: '', wildcard: '' }
      })
      return { ...m, values }
    })
  }

  async function recommend() {
    const seed = plays.find((p) => p.id === (seedId || matrix.shows[0]))
    if (!seed) {
      toast('Pick a show to build the season around.', 'error')
      return
    }
    setRecBusy(true)
    try {
      const text = await runSeasonRecommendation(seed, plays, settings)
      setMatrix((m) => ({ ...m, recommendationText: text }))
      toast('Recommendation ready', 'success')
    } catch (err) {
      console.error('[matrix] recommend failed', err)
      toast(err.message, 'error')
    } finally {
      setRecBusy(false)
    }
  }

  async function autoFill() {
    if (!shows.some(Boolean)) {
      toast('Pick at least one show (Show 1–3) first.', 'error')
      return
    }
    setAutoBusy(true)
    try {
      const data = await runSeasonMatrix(shows, settings)
      setMatrix((m) => {
        const values = structuredClone(m.values)
        SLOTS.forEach((slot) => {
          const filled = data[slot]
          if (!filled) return
          SEASON_FACTORS.forEach((f) => {
            if (filled[f.id] != null) values[f.id][slot] = String(filled[f.id])
          })
        })
        return { ...m, values }
      })
      toast('Matrix auto-filled', 'success')
    } catch (err) {
      console.error('[matrix] autofill failed', err)
      toast(err.message, 'error')
    } finally {
      setAutoBusy(false)
    }
  }

  async function reviewBalance() {
    setReviewBusy(true)
    try {
      const text = await runBalanceReview(matrix, shows, settings)
      setMatrix((m) => ({ ...m, reviewText: text }))
      toast('Balance review ready', 'success')
    } catch (err) {
      console.error('[matrix] review failed', err)
      toast(err.message, 'error')
    } finally {
      setReviewBusy(false)
    }
  }

  if (plays.length === 0) {
    return (
      <div>
        <h2 className="mb-4 text-xl font-bold text-slate-800">Season Balance Matrix</h2>
        <EmptyState
          title="No plays yet"
          message="Add some plays first. Then choose three for the matrix, auto-fill it from their data or type your own values, and get an AI review of the season's balance."
        />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-slate-800">Season Balance Matrix</h2>
        <div className="flex flex-wrap gap-2">
          <button className="btn-ghost" onClick={clearGrid}>
            Clear
          </button>
          <button className="btn-accent" onClick={autoFill} disabled={!hasKey || autoBusy}>
            {autoBusy ? (
              <>
                <Spinner /> Auto-filling…
              </>
            ) : (
              <>
                <Sparkles /> Auto-fill with AI
              </>
            )}
          </button>
        </div>
      </div>

      {/* Season options */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {matrices.map((m) => (
          <button
            key={m.id}
            onClick={() => setActiveId(m.id)}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
              m.id === active.id
                ? 'border-primary bg-primary text-white'
                : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {m.name || 'Untitled'}
          </button>
        ))}
        <button
          onClick={addOption}
          className="rounded-full border border-dashed border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-50"
        >
          + Add option
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <label className="text-sm text-slate-500">Option name</label>
        <input
          className="field-input w-auto"
          value={active.name || ''}
          onChange={(e) => setMatrix((m) => ({ ...m, name: e.target.value }))}
          placeholder="e.g. Crowd-pleaser season"
        />
        <button
          className="text-sm font-medium text-accent hover:text-primary"
          onClick={duplicateOption}
        >
          Duplicate
        </button>
        <button
          className="text-sm font-medium text-red-600 hover:text-red-700"
          onClick={deleteOption}
        >
          Delete option
        </button>
      </div>

      <p className="mb-4 text-sm text-slate-500">
        Build one or more season options. For each, choose three shows, then auto-fill the grid from
        their data and research or type your own values. The <strong>Wildcard</strong> is the open
        4th slot — empty by default, but you can rename its header and fill it in by hand. You can
        include any of these options in the exported PDF.
      </p>

      {!hasKey && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Add your Anthropic API key in Settings to use Auto-fill and AI review. You can still fill
          the matrix by hand.
        </div>
      )}

      {/* Show pickers */}
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {COLUMNS.map((col, i) => (
          <div key={col.key}>
            <label className="field-label">{col.label}</label>
            <select
              className="field-input"
              value={matrix.shows[i] || ''}
              onChange={(e) => setShow(i, e.target.value)}
            >
              <option value="">Select a play…</option>
              {ranked.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title || '(untitled)'}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {/* Matrix table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50">
              <th className="sticky left-0 z-10 w-48 bg-slate-50 px-3 py-3 text-left font-semibold text-slate-600">
                Factor
              </th>
              {COLUMNS.map((col, i) => (
                <th key={col.key} className="min-w-[12rem] border-l border-slate-200 px-3 py-3 text-left">
                  <div className="font-semibold text-slate-800">{shows[i]?.title || col.label}</div>
                  {shows[i]?.title && <div className="text-xs font-normal text-slate-400">{col.label}</div>}
                </th>
              ))}
              <th className="min-w-[11rem] border-l border-slate-200 bg-amber-50/40 px-3 py-3 text-left">
                <input
                  className="w-full bg-transparent font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none"
                  value={matrix.wildcardLabel || ''}
                  onChange={(e) => setMatrix((m) => ({ ...m, wildcardLabel: e.target.value }))}
                  placeholder="Wildcard"
                />
                <div className="text-xs font-normal text-slate-400">open — fill by hand if you like</div>
              </th>
            </tr>
          </thead>
          <tbody>
            {SEASON_FACTORS.map((f) => (
              <tr key={f.id} className="border-t border-slate-100 align-top">
                <td className="sticky left-0 z-10 bg-white px-3 py-2 font-medium text-slate-600">
                  {f.label}
                </td>
                {SLOTS.map((slot) => (
                  <td key={slot} className="border-l border-slate-100 px-2 py-1.5">
                    <input
                      className="w-full rounded-md border border-transparent bg-transparent px-2 py-1 text-slate-800 hover:border-slate-200 focus:border-accent focus:bg-white focus:outline-none focus:ring-1 focus:ring-accent"
                      value={matrix.values[f.id]?.[slot] || ''}
                      onChange={(e) => setCell(f.id, slot, e.target.value)}
                      placeholder="—"
                    />
                  </td>
                ))}
                {/* Wildcard: empty by default, but editable by hand */}
                <td className="border-l border-slate-100 bg-amber-50/20 px-2 py-1.5">
                  <input
                    className="w-full rounded-md border border-transparent bg-transparent px-2 py-1 text-slate-800 hover:border-slate-200 focus:border-accent focus:bg-white focus:outline-none focus:ring-1 focus:ring-accent"
                    value={matrix.values[f.id]?.wildcard || ''}
                    onChange={(e) => setCell(f.id, 'wildcard', e.target.value)}
                    placeholder="—"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Build a season from one show */}
      <div className="card mt-6 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-800">Build a season from one show</h3>
            <p className="text-sm text-slate-500">
              Pick one show you know you want, and let AI recommend two more to balance the season.
              The Wildcard stays open.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="field-input w-auto"
              value={seedId || matrix.shows[0] || ''}
              onChange={(e) => setSeedId(e.target.value)}
            >
              <option value="">Pick a show…</option>
              {ranked.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title || '(untitled)'}
                </option>
              ))}
            </select>
            <button className="btn-accent" onClick={recommend} disabled={!hasKey || recBusy}>
              {recBusy ? (
                <>
                  <Spinner /> Thinking…
                </>
              ) : (
                <>
                  <Sparkles /> Recommend two more
                </>
              )}
            </button>
          </div>
        </div>
        {matrix.recommendationText && (
          <RichText
            text={matrix.recommendationText}
            className="mt-4 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700"
          />
        )}
      </div>

      {/* AI balance review */}
      <div className="card mt-6 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-800">AI Balance Review</h3>
            <p className="text-sm text-slate-500">
              Assess variety and gaps across the three shows, and get a recommendation for the
              Wildcard slot.
            </p>
          </div>
          <button className="btn-primary" onClick={reviewBalance} disabled={!hasKey || reviewBusy}>
            {reviewBusy ? (
              <>
                <Spinner /> Reviewing…
              </>
            ) : (
              <>
                <Sparkles /> Review balance
              </>
            )}
          </button>
        </div>
        {matrix.reviewText && (
          <RichText
            text={matrix.reviewText}
            className="mt-4 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700"
          />
        )}
      </div>
    </div>
  )
}
