import { useMemo, useState } from 'react'
import EmptyState from './EmptyState.jsx'
import ScoreBadge from './ScoreBadge.jsx'
import ResearchPanel from './ResearchPanel.jsx'
import { ChevronDown, ChevronUp } from './Icons.jsx'
import {
  getScore,
  maxScore,
  scoreTier,
  sortPlays,
  sortByMetric,
  fitTotal,
  combinedScore,
  combinedTier,
  averageOfAll,
} from '../lib/scoring.js'
import { FIT_MAX } from '../constants.js'

const METRICS = [
  { id: 'combined', label: 'Combined rank' },
  { id: 'my', label: 'Your score' },
  { id: 'fit', label: 'Venue fit' },
]

// The badge value/label/tier for a play under the active ranking metric.
function metricBadge(p, settings, metric) {
  if (metric === 'my') {
    return { value: getScore(p), suffix: `/ ${maxScore(settings)}`, tier: scoreTier(p, settings) }
  }
  if (metric === 'fit') {
    const ft = fitTotal(p)
    if (ft == null) return { value: '—', suffix: '', tier: 'low' }
    return { value: ft, suffix: `/ ${FIT_MAX}`, tier: combinedTier((ft / FIT_MAX) * 100) }
  }
  const c = combinedScore(p, settings)
  return { value: Math.round(c), suffix: '/ 100', tier: combinedTier(c) }
}

function SummaryCard({ plays, settings }) {
  const top = useMemo(() => {
    if (!plays.length) return null
    return sortPlays(plays, 'score', 'desc')[0]
  }, [plays])

  const avg = averageOfAll(plays)
  const researched = plays.filter((p) => p.researchedAt).length

  const stats = [
    { label: 'Plays entered', value: plays.length },
    { label: 'Top-scored play', value: top ? top.title || '(untitled)' : '—' },
    { label: 'Average score', value: plays.length ? avg.toFixed(1) : '—' },
    { label: 'Research completed', value: `${researched} / ${plays.length}` },
  ]

  return (
    <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.map((s) => (
        <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{s.label}</p>
          <p className="mt-1 truncate text-lg font-bold text-primary" title={String(s.value)}>
            {s.value}
          </p>
        </div>
      ))}
    </div>
  )
}

const EMPTY_FILTERS = {
  genre: '',
  castMin: '',
  castMax: '',
  runtimeMin: '',
  runtimeMax: '',
  minScore: '',
}

export default function Dashboard({ plays, settings }) {
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [expanded, setExpanded] = useState(null)
  const [rankBy, setRankBy] = useState('combined')
  const max = maxScore(settings)

  const genres = useMemo(
    () => [...new Set(plays.map((p) => p.genre).filter(Boolean))].sort(),
    [plays],
  )

  const filtered = useMemo(() => {
    const ranked = sortByMetric(plays, settings, rankBy, 'desc')
    return ranked.filter((p) => {
      if (filters.genre && p.genre !== filters.genre) return false
      const cMin = Number(p.castMin) || 0
      const cMax = Number(p.castMax) || cMin || 0
      if (filters.castMin && cMax < Number(filters.castMin)) return false
      if (filters.castMax && cMin > Number(filters.castMax) && cMin !== 0) return false
      const rt = Number(p.runtime) || 0
      if (filters.runtimeMin && rt && rt < Number(filters.runtimeMin)) return false
      if (filters.runtimeMax && rt && rt > Number(filters.runtimeMax)) return false
      if (filters.minScore && getScore(p) < Number(filters.minScore)) return false
      return true
    })
  }, [plays, settings, rankBy, filters])

  if (plays.length === 0) {
    return (
      <div>
        <h2 className="mb-4 text-xl font-bold text-slate-800">Dashboard</h2>
        <EmptyState
          title="Your dashboard is empty"
          message="Once you add or import plays with their scores, they'll appear here ranked by score with color-coded badges and expandable research."
        />
      </div>
    )
  }

  const filtersActive = JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS)

  function setFilter(key, value) {
    setFilters((f) => ({ ...f, [key]: value }))
  }

  return (
    <div>
      <h2 className="mb-4 text-xl font-bold text-slate-800">Dashboard</h2>
      <SummaryCard plays={plays} settings={settings} />

      {/* Filters */}
      <div className="card mb-6 p-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <div>
            <label className="field-label">Genre</label>
            <select
              className="field-input"
              value={filters.genre}
              onChange={(e) => setFilter('genre', e.target.value)}
            >
              <option value="">All</option>
              {genres.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Cast ≥</label>
            <input
              type="number"
              className="field-input"
              value={filters.castMin}
              onChange={(e) => setFilter('castMin', e.target.value)}
            />
          </div>
          <div>
            <label className="field-label">Cast ≤</label>
            <input
              type="number"
              className="field-input"
              value={filters.castMax}
              onChange={(e) => setFilter('castMax', e.target.value)}
            />
          </div>
          <div>
            <label className="field-label">Runtime ≥</label>
            <input
              type="number"
              className="field-input"
              value={filters.runtimeMin}
              onChange={(e) => setFilter('runtimeMin', e.target.value)}
            />
          </div>
          <div>
            <label className="field-label">Runtime ≤</label>
            <input
              type="number"
              className="field-input"
              value={filters.runtimeMax}
              onChange={(e) => setFilter('runtimeMax', e.target.value)}
            />
          </div>
          <div>
            <label className="field-label">Min score</label>
            <input
              type="number"
              className="field-input"
              value={filters.minScore}
              onChange={(e) => setFilter('minScore', e.target.value)}
            />
          </div>
        </div>
        {filtersActive && (
          <div className="mt-3 flex items-center justify-between">
            <span className="text-sm text-slate-500">
              Showing {filtered.length} of {plays.length} plays
            </span>
            <button className="text-sm font-medium text-accent hover:text-primary" onClick={() => setFilters(EMPTY_FILTERS)}>
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Ranking metric */}
      <div className="mb-3 flex items-center gap-2">
        <span className="text-sm font-medium text-slate-600">Rank by</span>
        <div className="inline-flex overflow-hidden rounded-md border border-slate-300">
          {METRICS.map((m) => (
            <button
              key={m.id}
              onClick={() => setRankBy(m.id)}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                rankBy === m.id
                  ? 'bg-primary text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Ranked list */}
      <div className="space-y-2">
        {filtered.map((p, idx) => {
          const badge = metricBadge(p, settings, rankBy)
          const isOpen = expanded === p.id
          return (
            <div key={p.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <button
                className="flex w-full items-center gap-4 px-4 py-3 text-left hover:bg-slate-50"
                onClick={() => setExpanded(isOpen ? null : p.id)}
              >
                <span className="w-6 shrink-0 text-center text-sm font-bold text-slate-400">
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-800">
                    {p.title || '(untitled)'}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {[p.playwright, p.genre, p.runtime ? `${p.runtime} min` : null]
                      .filter(Boolean)
                      .join(' • ') || '—'}
                  </p>
                </div>
                {p.researchedAt && (
                  <span className="hidden rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent sm:inline">
                    Researched
                  </span>
                )}
                <ScoreBadge tier={badge.tier} title={`${badge.value} ${badge.suffix}`}>
                  {badge.value}
                </ScoreBadge>
                {isOpen ? <ChevronUp /> : <ChevronDown />}
              </button>

              {isOpen && (
                <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-4">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <h4 className="mb-2 text-sm font-semibold text-primary">Details</h4>
                      <dl className="space-y-1.5 text-sm">
                        <div className="flex justify-between">
                          <dt className="text-slate-600">Combined rank</dt>
                          <dd className="font-bold text-primary">
                            {Math.round(combinedScore(p, settings))} / 100
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-slate-600">Your score</dt>
                          <dd className="font-semibold text-slate-800">
                            {getScore(p)} / {max}
                          </dd>
                        </div>
                        <div className="flex justify-between border-b border-slate-100 pb-1.5">
                          <dt className="text-slate-600">Venue fit</dt>
                          <dd className="font-semibold text-slate-800">
                            {fitTotal(p) == null ? 'Not scored' : `${fitTotal(p)} / ${FIT_MAX}`}
                          </dd>
                        </div>
                        {p.yearWritten && (
                          <div className="flex justify-between">
                            <dt className="text-slate-600">Year written</dt>
                            <dd className="text-slate-800">{p.yearWritten}</dd>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <dt className="text-slate-600">Cast size</dt>
                          <dd className="text-slate-800">
                            {p.castMin || p.castMax
                              ? `${p.castMin || '?'}–${p.castMax || '?'}`
                              : '—'}
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-slate-600">Runtime</dt>
                          <dd className="text-slate-800">{p.runtime ? `${p.runtime} min` : '—'}</dd>
                        </div>
                      </dl>
                      {p.staging && (
                        <div className="mt-4">
                          <h4 className="mb-1 text-sm font-semibold text-primary">Staging Notes</h4>
                          <p className="text-sm text-slate-600">{p.staging}</p>
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="mb-2 text-sm font-semibold text-primary">Market Research</h4>
                      <ResearchPanel research={p.research} researchedAt={p.researchedAt} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-500">
            No plays match the current filters.
          </p>
        )}
      </div>
    </div>
  )
}
