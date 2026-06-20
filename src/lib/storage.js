import { DEFAULT_SETTINGS } from '../constants.js'

const PLAYS_KEY = 'psg_plays'
const SETTINGS_KEY = 'psg_settings'

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
