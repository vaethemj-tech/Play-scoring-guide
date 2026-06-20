import { DEFAULT_SETTINGS, SEASON_FACTORS } from '../constants.js'

const PLAYS_KEY = 'psg_plays'
const SETTINGS_KEY = 'psg_settings'
const MATRIX_KEY = 'psg_matrix'

export function emptyMatrix() {
  const values = {}
  SEASON_FACTORS.forEach((f) => {
    values[f.id] = { show1: '', show2: '', show3: '', wildcard: '' }
  })
  return {
    shows: [null, null, null],
    wildcardLabel: '',
    reviewText: '',
    recommendationText: '',
    values,
  }
}

// Ensures a matrix object has every factor row (forward-compatible).
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
    shows,
    wildcardLabel: m.wildcardLabel || '',
    reviewText: m.reviewText || '',
    recommendationText: m.recommendationText || '',
    values,
  }
}

export function loadMatrix() {
  try {
    const raw = localStorage.getItem(MATRIX_KEY)
    return raw ? normalizeMatrix(JSON.parse(raw)) : emptyMatrix()
  } catch {
    return emptyMatrix()
  }
}

export function saveMatrix(matrix) {
  localStorage.setItem(MATRIX_KEY, JSON.stringify(matrix))
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
