import { useState } from 'react'
import PlayForm from './PlayForm.jsx'
import CsvImport from './CsvImport.jsx'
import EmptyState from './EmptyState.jsx'
import ScoreBadge from './ScoreBadge.jsx'
import { Edit, Trash, Plus, Download, ChevronUp, ChevronDown } from './Icons.jsx'
import { sortPlays, totalScore, scoreTier } from '../lib/scoring.js'

const COLUMNS = [
  { key: 'title', label: 'Title' },
  { key: 'playwright', label: 'Playwright' },
  { key: 'genre', label: 'Genre' },
  { key: 'runtime', label: 'Runtime' },
  { key: 'castMax', label: 'Cast' },
  { key: 'total', label: 'Score' },
]

export default function PlaysManager({ plays, categories, onSave, onDelete, onImport }) {
  const [mode, setMode] = useState('list') // 'list' | 'form' | 'import'
  const [editing, setEditing] = useState(null)
  const [sort, setSort] = useState({ key: 'total', dir: 'desc' })

  const sorted = sortPlays(plays, categories, sort.key, sort.dir)

  function startAdd() {
    setEditing(null)
    setMode('form')
  }
  function startEdit(play) {
    setEditing(play)
    setMode('form')
  }
  function handleSave(play) {
    onSave(play)
    setMode('list')
    setEditing(null)
  }
  function toggleSort(key) {
    setSort((s) =>
      s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' },
    )
  }

  if (mode === 'form') {
    return (
      <div className="mx-auto max-w-3xl">
        <h2 className="mb-4 text-xl font-bold text-slate-800">
          {editing ? 'Edit Play' : 'Add a Play'}
        </h2>
        <PlayForm
          categories={categories}
          initial={editing}
          onSave={handleSave}
          onCancel={() => {
            setMode('list')
            setEditing(null)
          }}
        />
      </div>
    )
  }

  if (mode === 'import') {
    return (
      <div className="mx-auto max-w-3xl">
        <h2 className="mb-4 text-xl font-bold text-slate-800">Import Plays</h2>
        <CsvImport
          categories={categories}
          onImport={(rows) => {
            onImport(rows)
            setMode('list')
          }}
          onCancel={() => setMode('list')}
        />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-slate-800">Plays</h2>
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={() => setMode('import')}>
            <Download /> Import CSV
          </button>
          <button className="btn-primary" onClick={startAdd}>
            <Plus /> Add Play
          </button>
        </div>
      </div>

      {plays.length === 0 ? (
        <EmptyState
          title="No plays yet"
          message="Add your first play with the scoring form, or import a spreadsheet of plays you've already scored."
          action={
            <div className="flex justify-center gap-2">
              <button className="btn-primary" onClick={startAdd}>
                <Plus /> Add Play
              </button>
              <button className="btn-ghost" onClick={() => setMode('import')}>
                <Download /> Import CSV
              </button>
            </div>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    className="cursor-pointer select-none px-4 py-3 text-left font-semibold text-slate-600 hover:text-primary"
                    onClick={() => toggleSort(col.key)}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      {sort.key === col.key &&
                        (sort.dir === 'asc' ? (
                          <ChevronUp width={14} height={14} />
                        ) : (
                          <ChevronDown width={14} height={14} />
                        ))}
                    </span>
                  </th>
                ))}
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {sorted.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {p.title || '(untitled)'}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{p.playwright || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{p.genre || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{p.runtime ? `${p.runtime}m` : '—'}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {p.castMin || p.castMax
                      ? `${p.castMin || '?'}–${p.castMax || '?'}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <ScoreBadge tier={scoreTier(p, categories)}>
                      {totalScore(p, categories)}
                    </ScoreBadge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-primary"
                        title="Edit"
                        onClick={() => startEdit(p)}
                      >
                        <Edit />
                      </button>
                      <button
                        className="rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600"
                        title="Delete"
                        onClick={() => {
                          if (confirm(`Delete "${p.title || 'this play'}"?`)) onDelete(p.id)
                        }}
                      >
                        <Trash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
