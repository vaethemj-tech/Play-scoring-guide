import { DEFAULT_SETTINGS, SEASON_FACTORS } from '../constants.js'

const PLAYS_KEY = 'psg_plays'
const SETTINGS_KEY = 'psg_settings'
const MATRIX_KEY = 'psg_matrix' // legacy single-matrix key (migrated)
const MATRICES_KEY = 'psg_matrices'

export function emptyMatrix(name = 'Option A') {
  const values = {}
  SEASON_FACTORS.forEach((f) => {
    values[f.id] = { show1: '', show2: '', show3: '', wildcard: '' }
  })
  return {
    id: uid(),
    name,
    shows: [null, null, null],
    wildcardLabel: '',
    reviewText: '',
    recommendationText: '',
    values,
  }
}

// Ensures a matrix object has an id, name, and every factor row.
export function normalizeMatrix(m) {
  const base = emptyMatrix()
  if (!m || typeof m !== 'object') return base
  const shows = Array.isArray(m.shows) ? [m.shows[0] ?? null, m.shows[1] ?? null, m.shows[2] ?? null] : base.shows
  const values = { ...base.values }
  if (m.values && typeof m.values === 'object') {
    SEASON_FACTORS.forEach((f) => {
      const row = m.values[f.id]
      if (row && typeof row === 'object') {
        values[f.id] = {
          show1: row.show1 || '',
          show2: row.show2 || '',
          show3: row.show3 || '',
          wildcard: row.wildcard || '',
        }
      }
    })
  }
  return {
    id: m.id || uid(),
    name: m.name || 'Option',
    shows,
    wildcardLabel: m.wildcardLabel || '',
    reviewText: m.reviewText || '',
    recommendationText: m.recommendationText || '',
    values,
  }
}

export function normalizeMatrices(arr) {
  if (Array.isArray(arr) && arr.length) return arr.map(normalizeMatrix)
  return [emptyMatrix('Option A')]
}

export function loadMatrices() {
  try {
    const raw = localStorage.getItem(MATRICES_KEY)
    if (raw) {
      const arr = JSON.parse(raw)
      if (Array.isArray(arr) && arr.length) return arr.map(normalizeMatrix)
    }
    // Migrate a legacy single matrix into a one-item collection.
    const old = localStorage.getItem(MATRIX_KEY)
    if (old) return [normalizeMatrix(JSON.parse(old))]
  } catch {
    /* fall through */
  }
  return [emptyMatrix('Option A')]
}

export function saveMatrices(arr) {
  localStorage.setItem(MATRICES_KEY, JSON.stringify(arr))
}

export function loadPlays() {
  try {
    const raw = localStorage.getItem(PLAYS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function savePlays(plays) {
  localStorage.setItem(PLAYS_KEY, JSON.stringify(plays))
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    const parsed = JSON.parse(raw)
    // Merge so new default fields appear for users with older saved settings.
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      maxScore: Number(parsed.maxScore) || DEFAULT_SETTINGS.maxScore,
    }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

export function clearAll() {
  localStorage.removeItem(PLAYS_KEY)
  localStorage.removeItem(SETTINGS_KEY)
  localStorage.removeItem(MATRIX_KEY)
  localStorage.removeItem(MATRICES_KEY)
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

// A stable per-device id used for cloud presence (who's online).
const MEMBER_KEY = 'psg_member_id'
export function loadMemberId() {
  let id = localStorage.getItem(MEMBER_KEY)
  if (!id) {
    id = uid()
    localStorage.setItem(MEMBER_KEY, id)
  }
  return id
}
