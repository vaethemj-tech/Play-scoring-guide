import { useState } from 'react'
import { GENRES } from '../constants.js'
import { uid } from '../lib/storage.js'
import { maxScore } from '../lib/scoring.js'

function emptyPlay() {
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
    synopsis: '',
    score: '',
    research: null,
    researchedAt: null,
  }
}

export default function PlayForm({ settings, initial, onSave, onCancel }) {
  const max = maxScore(settings)
  const [play, setPlay] = useState(() => {
    if (!initial) return emptyPlay()
    // Migrate a legacy per-category play to a single score if needed.
    let score = initial.score
    if ((score === '' || score == null) && initial.scores) {
      score = Object.values(initial.scores).reduce((s, v) => s + (Number(v) || 0), 0)
    }
    return { ...initial, score: score ?? '' }
  })

  const isEditing = Boolean(initial)

  function set(field, value) {
    setPlay((p) => ({ ...p, [field]: value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!play.title.trim()) return
    // Normalize the score to a number within range (blank allowed = unscored).
    let score = play.score
    if (score !== '' && score != null) {
      score = Math.min(max, Math.max(0, Number(score) || 0))
    }
    onSave({ ...play, score, id: play.id || uid() })
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
            <label className="field-label">Synopsis</label>
            <textarea
              className="field-input min-h-[80px]"
              value={play.synopsis}
              onChange={(e) => set('synopsis', e.target.value)}
              placeholder="A short plot summary. Leave blank and research will fill it in for you."
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
        <h3 className="mb-2 text-base font-semibold text-slate-800">Score</h3>
        <p className="mb-4 text-sm text-slate-500">
          Enter the total score this play already received from your scoring rubric.
        </p>
        <div className="flex items-end gap-3">
          <div>
            <label className="field-label">Score received</label>
            <input
              type="number"
              min="0"
              max={max}
              step="1"
              className="field-input w-32 text-lg font-semibold"
              value={play.score}
              onChange={(e) => set('score', e.target.value)}
              placeholder="0"
            />
          </div>
          <span className="pb-2 text-lg font-medium text-slate-500">/ {max}</span>
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
