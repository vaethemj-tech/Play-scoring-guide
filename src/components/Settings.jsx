import { useState } from 'react'
import { DEFAULT_MAX_SCORE, FIT_CATEGORIES } from '../constants.js'
import { testApiKey } from '../lib/anthropic.js'
import { useToast } from './Toast.jsx'

export default function Settings({ settings, onSave, onResetAll }) {
  const toast = useToast()
  const [draft, setDraft] = useState(() => structuredClone(settings))
  const [keyTest, setKeyTest] = useState({ status: 'idle', message: '' })

  async function handleTestKey() {
    setKeyTest({ status: 'testing', message: '' })
    try {
      await testApiKey(draft.apiKey)
      setKeyTest({ status: 'ok', message: 'Key works — the Anthropic API responded successfully.' })
    } catch (err) {
      setKeyTest({ status: 'fail', message: err.message })
    }
  }

  function set(field, value) {
    setDraft((d) => ({ ...d, [field]: value }))
  }

  function handleSave() {
    const max = Number(draft.maxScore)
    if (!Number.isFinite(max) || max <= 0) {
      toast('Maximum score must be a positive number.', 'error')
      return
    }
    onSave({ ...draft, maxScore: max })
    toast('Settings saved', 'success')
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h2 className="text-xl font-bold text-slate-800">Settings</h2>

      <div className="card p-5">
        <h3 className="mb-4 text-base font-semibold text-slate-800">Theater</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label">Theater Name</label>
            <input
              className="field-input"
              value={draft.theaterName}
              onChange={(e) => set('theaterName', e.target.value)}
              placeholder="e.g. Riverside Community Theater"
            />
            <p className="mt-1 text-xs text-slate-400">Used on the report cover page.</p>
          </div>
          <div>
            <label className="field-label">Season Year</label>
            <input
              className="field-input"
              value={draft.seasonYear}
              onChange={(e) => set('seasonYear', e.target.value)}
              placeholder="e.g. 2026"
            />
          </div>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="mb-2 text-base font-semibold text-slate-800">Scoring</h3>
        <p className="mb-4 text-sm text-slate-500">
          Plays are scored against your rubric outside the app, and you enter each play's total
          here. Set the maximum possible score so rankings and color badges scale correctly.
        </p>
        <div className="flex items-end gap-3">
          <div>
            <label className="field-label">Maximum score</label>
            <input
              type="number"
              min="1"
              step="1"
              className="field-input w-32 text-lg font-semibold"
              value={draft.maxScore}
              onChange={(e) => set('maxScore', e.target.value)}
            />
          </div>
          <button
            type="button"
            className="btn-ghost mb-0.5"
            onClick={() => set('maxScore', DEFAULT_MAX_SCORE)}
          >
            Reset to {DEFAULT_MAX_SCORE}
          </button>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="mb-2 text-base font-semibold text-slate-800">Venue Profile</h3>
        <p className="mb-4 text-sm text-slate-500">
          Used to compute each play's <strong>Venue Fit Score</strong> during research — how well it
          suits your specific space and audience.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label">Venue type</label>
            <input
              className="field-input"
              value={draft.venueType}
              onChange={(e) => set('venueType', e.target.value)}
              placeholder="e.g. Black box theatre"
            />
          </div>
          <div>
            <label className="field-label">Location</label>
            <input
              className="field-input"
              value={draft.venueLocation}
              onChange={(e) => set('venueLocation', e.target.value)}
              placeholder="e.g. Lindenhurst, Long Island, NY"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="field-label">Audience &amp; space notes</label>
            <textarea
              className="field-input min-h-[90px]"
              value={draft.audienceNotes}
              onChange={(e) => set('audienceNotes', e.target.value)}
              placeholder="Seats, demographics, budget, staging constraints…"
            />
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Fit is scored 1–10 in five categories: {FIT_CATEGORIES.map((c) => c.label).join(', ')}.
        </p>
      </div>

      <div className="card p-5">
        <h3 className="mb-2 text-base font-semibold text-slate-800">Combined Ranking</h3>
        <p className="mb-4 text-sm text-slate-500">
          Plays are ranked by a blend of <strong>your score</strong> and the{' '}
          <strong>venue-fit score</strong>. Choose how much each counts.
        </p>
        <div className="flex items-center gap-4">
          <span className="w-28 text-sm font-medium text-slate-600">Your score {draft.scoreBlend}%</span>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={draft.scoreBlend}
            onChange={(e) => set('scoreBlend', Number(e.target.value))}
            className="flex-1 accent-accent"
          />
          <span className="w-28 text-right text-sm font-medium text-slate-600">
            Venue fit {100 - draft.scoreBlend}%
          </span>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="mb-2 text-base font-semibold text-slate-800">Anthropic API Key</h3>
        <p className="mb-3 text-sm text-slate-500">
          Required for AI market research. Stored only in this browser's localStorage and sent
          directly to the Anthropic API — never anywhere else.
        </p>
        <input
          type="password"
          className="field-input font-mono"
          value={draft.apiKey}
          onChange={(e) => {
            set('apiKey', e.target.value)
            setKeyTest({ status: 'idle', message: '' })
          }}
          placeholder="sk-ant-…"
          autoComplete="off"
        />
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            className="btn-ghost"
            onClick={handleTestKey}
            disabled={keyTest.status === 'testing' || !draft.apiKey.trim()}
          >
            {keyTest.status === 'testing' ? 'Testing…' : 'Test key'}
          </button>
          {keyTest.status === 'ok' && (
            <span className="text-sm font-medium text-green-700">✓ {keyTest.message}</span>
          )}
          {keyTest.status === 'fail' && (
            <span className="text-sm font-medium text-red-700">✗ {keyTest.message}</span>
          )}
        </div>
        <p className="mt-2 text-xs text-slate-400">
          “Test key” makes a tiny call to the Anthropic API to confirm the key works. You don't need
          to save first.
        </p>
      </div>

      <div className="flex justify-end">
        <button className="btn-primary" onClick={handleSave}>
          Save Settings
        </button>
      </div>

      <div className="card border-red-200 bg-red-50/50 p-5">
        <h3 className="mb-2 text-base font-semibold text-red-700">Danger Zone</h3>
        <p className="mb-3 text-sm text-slate-600">
          Permanently delete all plays and reset settings in this browser. This cannot be undone.
        </p>
        <button
          className="btn-danger"
          onClick={() => {
            if (confirm('Delete ALL plays and reset all settings? This cannot be undone.')) {
              onResetAll()
              toast('All data has been reset.', 'info')
            }
          }}
        >
          Reset All Data
        </button>
      </div>
    </div>
  )
}
