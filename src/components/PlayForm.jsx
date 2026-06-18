import { useState } from 'react'
import { GENRES } from '../constants.js'
import { uid } from '../lib/storage.js'
import { totalScore, maxScore } from '../lib/scoring.js'

function emptyPlay(categories) {
  const scores = {}
  categories.forEach((c) => {
    scores[c.id] = 5
  })
  return {
    id: '',
    title: '',
    playwright: '',
    genre: '',
    yearWritten: '',
    runtime: '',
    castMin: '',
    castMax: '',
    staging: '',
    scores,
    research: null,
    researchedAt: null,
  }
}

export default function PlayForm({ categories, initial, onSave, onCancel }) {
  const [play, setPlay] = useState(() => {
    if (!initial) return emptyPlay(categories)
    // Ensure every current category has a score field.
    const scores = { ...initial.scores }
    categories.forEach((c) => {
      if (scores[c.id] == null) scores[c.id] = 5
    })
    return { ...initial, scores }
  })

  const isEditing = Boolean(initial)

  function set(field, value) {
    setPlay((p) => ({ ...p, [field]: value }))
  }

  function setScore(catId, value) {
    setPlay((p) => ({ ...p, scores: { ...p.scores, [catId]: Number(value) } }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!play.title.trim()) return
    onSave({ ...play, id: play.id || uid() })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="card p-5">
        <h3 className="mb-4 text-base font-semibold text-slate-800">Play Details</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="field-label">Title *</label>
            <input
              className="field-input"
              value={play.title}
              onChange={(e) => set('title', e.target.value)}
              required
              placeholder="e.g. Our Town"
            />
          </div>
          <div>
            <label className="field-label">Playwright</label>
            <input
              className="field-input"
              value={play.playwright}
              onChange={(e) => set('playwright', e.target.value)}
              placeholder="e.g. Thornton Wilder"
            />
          </div>
          <div>
            <label className="field-label">Genre</label>
            <select
              className="field-input"
              value={play.genre}
              onChange={(e) => set('genre', e.target.value)}
            >
              <option value="">Select genre…</option>
              {GENRES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Year Written</label>
            <input
              type="number"
              className="field-input"
              value={play.yearWritten}
              onChange={(e) => set('yearWritten', e.target.value)}
              placeholder="e.g. 1938"
            />
          </div>
          <div>
            <label className="field-label">Runtime (minutes)</label>
            <input
              type="number"
              min="0"
              className="field-input"
              value={play.runtime}
              onChange={(e) => set('runtime', e.target.value)}
              placeholder="e.g. 120"
            />
          </div>
          <div>
            <label className="field-label">Cast Size — Min</label>
            <input
              type="number"
              min="0"
              className="field-input"
              value={play.castMin}
              onChange={(e) => set('castMin', e.target.value)}
              placeholder="e.g. 8"
            />
          </div>
          <div>
            <label className="field-label">Cast Size — Max</label>
            <input
              type="number"
              min="0"
              className="field-input"
              value={play.castMax}
              onChange={(e) => set('castMax', e.target.value)}
              placeholder="e.g. 20"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="field-label">Special Staging Requirements</label>
            <textarea
              className="field-input min-h-[80px]"
              value={play.staging}
              onChange={(e) => set('staging', e.target.value)}
              placeholder="Turntable, fly system, period costumes, live orchestra…"
            />
          </div>
        </div>
      </div>

      <div className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-800">Scoring Rubric</h3>
          <span className="text-sm font-semibold text-primary">
            Total: {totalScore(play, categories)} / {maxScore(categories)}
          </span>
        </div>
        <div className="space-y-4">
          {categories.map((c) => (
            <div key={c.id} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                <span className="text-sm font-medium text-slate-700">{c.label}</span>
                {c.description && (
                  <span className="block text-xs text-slate-400">{c.description}</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={play.scores[c.id] ?? 5}
                  onChange={(e) => setScore(c.id, e.target.value)}
                  className="w-40 accent-accent"
                />
                <span className="w-6 text-right text-sm font-semibold text-slate-800">
                  {play.scores[c.id] ?? 5}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button type="submit" className="btn-primary">
          {isEditing ? 'Save Changes' : 'Add Play'}
        </button>
        {onCancel && (
          <button type="button" className="btn-ghost" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
