import { useState } from 'react'
import { Plus, Trash } from './Icons.jsx'
import { DEFAULT_CATEGORIES } from '../constants.js'
import { uid } from '../lib/storage.js'
import { useToast } from './Toast.jsx'

export default function Settings({ settings, onSave, onResetAll }) {
  const toast = useToast()
  const [draft, setDraft] = useState(() => structuredClone(settings))

  function set(field, value) {
    setDraft((d) => ({ ...d, [field]: value }))
  }

  function setCategory(id, field, value) {
    setDraft((d) => ({
      ...d,
      categories: d.categories.map((c) => (c.id === id ? { ...c, [field]: value } : c)),
    }))
  }

  function addCategory() {
    setDraft((d) => ({
      ...d,
      categories: [
        ...d.categories,
        { id: uid(), label: 'New Category', description: '', weight: 1 },
      ],
    }))
  }

  function removeCategory(id) {
    setDraft((d) => ({ ...d, categories: d.categories.filter((c) => c.id !== id) }))
  }

  function restoreDefaultCategories() {
    setDraft((d) => ({ ...d, categories: structuredClone(DEFAULT_CATEGORIES) }))
  }

  function handleSave() {
    if (!draft.categories.length) {
      toast('You need at least one scoring category.', 'error')
      return
    }
    const cleaned = {
      ...draft,
      categories: draft.categories.map((c) => ({
        ...c,
        weight: Number(c.weight) || 0,
        label: c.label.trim() || 'Untitled',
      })),
    }
    onSave(cleaned)
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
        <h3 className="mb-2 text-base font-semibold text-slate-800">Anthropic API Key</h3>
        <p className="mb-3 text-sm text-slate-500">
          Required for AI market research. Stored only in this browser's localStorage and sent
          directly to the Anthropic API — never anywhere else.
        </p>
        <input
          type="password"
          className="field-input font-mono"
          value={draft.apiKey}
          onChange={(e) => set('apiKey', e.target.value)}
          placeholder="sk-ant-…"
          autoComplete="off"
        />
      </div>

      <div className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-800">Scoring Categories</h3>
          <button className="text-sm font-medium text-accent hover:text-primary" onClick={restoreDefaultCategories}>
            Restore defaults
          </button>
        </div>
        <div className="space-y-3">
          <div className="hidden grid-cols-[1fr_5rem_2.5rem] gap-3 px-1 text-xs font-medium uppercase tracking-wide text-slate-400 sm:grid">
            <span>Label</span>
            <span>Weight</span>
            <span />
          </div>
          {draft.categories.map((c) => (
            <div key={c.id} className="grid grid-cols-[1fr_5rem_2.5rem] items-center gap-3">
              <input
                className="field-input"
                value={c.label}
                onChange={(e) => setCategory(c.id, 'label', e.target.value)}
              />
              <input
                type="number"
                min="0"
                step="0.5"
                className="field-input"
                value={c.weight}
                onChange={(e) => setCategory(c.id, 'weight', e.target.value)}
              />
              <button
                className="flex h-9 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600"
                title="Remove category"
                onClick={() => removeCategory(c.id)}
              >
                <Trash />
              </button>
            </div>
          ))}
        </div>
        <button className="btn-ghost mt-4" onClick={addCategory}>
          <Plus /> Add Category
        </button>
        <p className="mt-3 text-xs text-slate-400">
          Each category is scored 1–10. A play's total is the sum of (score × weight) across all
          categories.
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
