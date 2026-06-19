// Scoring helpers. Each play stores a single received total score (entered by
// the user, out of a configurable maximum — default 80). Badge color is keyed
// to the score as a percentage of the maximum.
import { DEFAULT_MAX_SCORE, FIT_CATEGORIES, FIT_MAX } from '../constants.js'

// Returns a play's score. Falls back to summing legacy per-category scores so
// plays entered under the old grading model keep their value.
export function getScore(play) {
  if (!play) return 0
  if (Number.isFinite(Number(play.score)) && play.score !== '' && play.score != null) {
    return Number(play.score)
  }
  if (play.scores && typeof play.scores === 'object') {
    return Object.values(play.scores).reduce((s, v) => s + (Number(v) || 0), 0)
  }
  return 0
}

export function maxScore(settings) {
  return Number(settings?.maxScore) || DEFAULT_MAX_SCORE
}

// Tier used for color-coded badges: 'high' | 'mid' | 'low'.
export function scoreTier(play, settings) {
  const max = maxScore(settings)
  const pct = max ? getScore(play) / max : 0
  if (pct >= 0.7) return 'high'
  if (pct >= 0.4) return 'mid'
  return 'low'
}

export const TIER_CLASSES = {
  high: 'bg-green-100 text-green-800 border border-green-300',
  mid: 'bg-amber-100 text-amber-800 border border-amber-300',
  low: 'bg-red-100 text-red-800 border border-red-300',
}

// Maps a research rating to a tone, accounting for which direction is "good"
// for each kind (e.g. easy rights = good, hard rights = bad).
export function ratingTone(value, kind) {
  const good = { availability: 'Easy', complexity: 'Low', appeal: 'High' }[kind]
  const bad = { availability: 'Hard', complexity: 'High', appeal: 'Low' }[kind]
  if (!value || value === 'Unknown') return 'none'
  if (value === good) return 'good'
  if (value === bad) return 'bad'
  return 'mid'
}

export const RATING_CLASSES = {
  good: 'bg-green-100 text-green-800 border border-green-300',
  mid: 'bg-amber-100 text-amber-800 border border-amber-300',
  bad: 'bg-red-100 text-red-800 border border-red-300',
  none: 'bg-slate-100 text-slate-500 border border-slate-300',
}

export function sortPlays(plays, key, dir = 'asc') {
  const factor = dir === 'asc' ? 1 : -1
  const copy = [...plays]
  copy.sort((a, b) => {
    let av
    let bv
    if (key === 'score') {
      av = getScore(a)
      bv = getScore(b)
    } else if (key === 'castMax' || key === 'castMin' || key === 'runtime' || key === 'yearWritten') {
      av = Number(a[key]) || 0
      bv = Number(b[key]) || 0
    } else {
      av = (a[key] || '').toString().toLowerCase()
      bv = (b[key] || '').toString().toLowerCase()
    }
    if (av < bv) return -1 * factor
    if (av > bv) return 1 * factor
    return 0
  })
  return copy
}

export function averageOfAll(plays) {
  if (!plays.length) return 0
  const sum = plays.reduce((s, p) => s + getScore(p), 0)
  return sum / plays.length
}

// ---- AI venue-fit + combined scoring ----

export function hasFit(play) {
  return Boolean(play?.research?.fit)
}

// Sum of the venue-fit category scores (0–FIT_MAX), or null if not scored.
export function fitTotal(play) {
  const f = play?.research?.fit
  if (!f) return null
  return FIT_CATEGORIES.reduce((s, c) => s + (Number(f[c.id]) || 0), 0)
}

// Blended rank on a 0–100 scale: the user's own score and the venue-fit score,
// each normalized to a percentage, combined per the Settings blend weight. When
// a play has no fit score yet, the user's score percentage is used alone.
export function combinedScore(play, settings) {
  const max = maxScore(settings)
  const myPct = max ? (getScore(play) / max) * 100 : 0
  const ft = fitTotal(play)
  if (ft == null) return myPct
  const blend = Math.min(100, Math.max(0, Number(settings?.scoreBlend ?? 50)))
  const fitPct = (ft / FIT_MAX) * 100
  return myPct * (blend / 100) + fitPct * ((100 - blend) / 100)
}

// Ranks plays by a chosen metric: 'my' | 'fit' | 'combined'.
export function sortByMetric(plays, settings, metric = 'combined', dir = 'desc') {
  const factor = dir === 'asc' ? 1 : -1
  const value = (p) => {
    if (metric === 'fit') return fitTotal(p) ?? -1
    if (metric === 'my') return getScore(p)
    return combinedScore(p, settings)
  }
  return [...plays].sort((a, b) => (value(a) - value(b)) * factor)
}

// Tier for the combined (0–100) score, for badge coloring.
export function combinedTier(value) {
  if (value >= 70) return 'high'
  if (value >= 40) return 'mid'
  return 'low'
}

// Maps a research rating to a tone, accounting for which direction is "good"
