import { useState } from 'react'
import { DEFAULT_MAX_SCORE } from '../constants.js'
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
