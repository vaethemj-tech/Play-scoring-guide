import { useRef, useState } from 'react'
import Papa from 'papaparse'
import { uid } from '../lib/storage.js'

// Base play fields available as mapping targets, plus one target per scoring
// category (added dynamically).
const BASE_FIELDS = [
  { key: 'title', label: 'Title' },
  { key: 'playwright', label: 'Playwright' },
  { key: 'genre', label: 'Genre' },
  { key: 'yearWritten', label: 'Year Written' },
  { key: 'runtime', label: 'Runtime (min)' },
  { key: 'castMin', label: 'Cast Min' },
  { key: 'castMax', label: 'Cast Max' },
  { key: 'staging', label: 'Staging Notes' },
]

// Attempts to auto-match a CSV header to a field key.
function autoMatch(header, fields) {
  const norm = header.toLowerCase().replace(/[^a-z0-9]/g, '')
  const found = fields.find((f) => {
    const fk = f.label.toLowerCase().replace(/[^a-z0-9]/g, '')
    const kk = f.key.toLowerCase()
    return norm === fk || norm === kk || norm.includes(kk)
  })
  return found ? found.key : ''
}

export default function CsvImport({ categories, onImport, onCancel }) {
  const fileRef = useRef(null)
  const [rows, setRows] = useState([])
  const [headers, setHeaders] = useState([])
  const [mapping, setMapping] = useState({})
  const [error, setError] = useState('')

  const fields = [
    ...BASE_FIELDS,
    ...categories.map((c) => ({ key: `score:${c.id}`, label: `Score — ${c.label}` })),
  ]

  function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length) {
          setError(`Parse warning: ${results.errors[0].message}`)
        }
        const hdrs = results.meta.fields || []
        setHeaders(hdrs)
        setRows(results.data)
        // Pre-fill mapping by auto-matching each CSV column to a field.
        const initialMap = {}
        hdrs.forEach((h) => {
          initialMap[h] = autoMatch(h, fields)
        })
        setMapping(initialMap)
      },
      error: (err) => setError(err.message),
    })
  }

  function buildPlays() {
    // Invert mapping: field key -> CSV header.
    const fieldToHeader = {}
    Object.entries(mapping).forEach(([header, fieldKey]) => {
      if (fieldKey) fieldToHeader[fieldKey] = header
    })

    return rows
      .map((row) => {
        const scores = {}
        categories.forEach((c) => {
          const header = fieldToHeader[`score:${c.id}`]
          const raw = header ? Number(row[header]) : NaN
          scores[c.id] = Number.isFinite(raw) ? Math.min(10, Math.max(1, raw)) : 5
        })
        const get = (k) => {
          const h = fieldToHeader[k]
          return h ? (row[h] ?? '').toString().trim() : ''
        }
        return {
          id: uid(),
          title: get('title'),
          playwright: get('playwright'),
          genre: get('genre'),
          yearWritten: get('yearWritten'),
          runtime: get('runtime'),
          castMin: get('castMin'),
          castMax: get('castMax'),
          staging: get('staging'),
          scores,
          research: null,
          researchedAt: null,
        }
      })
      .filter((p) => p.title)
  }

  function handleImport() {
    const plays = buildPlays()
    if (!plays.length) {
      setError('No rows with a Title column were found. Map a column to Title.')
      return
    }
    onImport(plays)
  }

  return (
    <div className="card p-5">
      <h3 className="mb-2 text-base font-semibold text-slate-800">Import Plays from CSV</h3>
      <p className="mb-4 text-sm text-slate-500">
        Upload a spreadsheet (CSV) of plays. The first row should contain column headers; you can
        then map each column to a field below.
      </p>

      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        onChange={handleFile}
        className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-primary-dark"
      />

      {error && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {headers.length > 0 && (
        <>
          <p className="mt-5 mb-2 text-sm font-medium text-slate-700">
            Map columns ({rows.length} row{rows.length === 1 ? '' : 's'} detected)
          </p>
          <div className="max-h-72 space-y-2 overflow-y-auto rounded-md border border-slate-200 p-3">
            {headers.map((h) => (
              <div key={h} className="grid grid-cols-2 items-center gap-3">
                <span className="truncate text-sm text-slate-600" title={h}>
                  {h}
                </span>
                <select
                  className="field-input"
                  value={mapping[h] || ''}
                  onChange={(e) => setMapping((m) => ({ ...m, [h]: e.target.value }))}
                >
                  <option value="">— ignore —</option>
                  {fields.map((f) => (
                    <option key={f.key} value={f.key}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="mt-5 flex gap-3">
            <button type="button" className="btn-primary" onClick={handleImport}>
              Import {rows.length} Row{rows.length === 1 ? '' : 's'}
            </button>
            <button type="button" className="btn-ghost" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  )
}
