// Scoring helpers. A play's total score is the weight-multiplied sum of each
// category score (each 1–10). Badge color is keyed to the weighted average so
// it stays meaningful even when categories are renamed or reweighted.

export function totalScore(play, categories) {
  if (!play?.scores) return 0
  return categories.reduce((sum, cat) => {
    const v = Number(play.scores[cat.id]) || 0
    return sum + v * (Number(cat.weight) || 0)
  }, 0)
}

export function maxScore(categories) {
  return categories.reduce((sum, cat) => sum + 10 * (Number(cat.weight) || 0), 0)
}

export function weightedAverage(play, categories) {
  const totalWeight = categories.reduce((s, c) => s + (Number(c.weight) || 0), 0)
  if (!totalWeight) return 0
  return totalScore(play, categories) / totalWeight
}

// Returns a tier used for color-coded badges: 'high' | 'mid' | 'low'.
export function scoreTier(play, categories) {
  const avg = weightedAverage(play, categories)
  if (avg >= 7) return 'high'
  if (avg >= 4) return 'mid'
  return 'low'
}

export const TIER_CLASSES = {
  high: 'bg-green-100 text-green-800 border border-green-300',
  mid: 'bg-amber-100 text-amber-800 border border-amber-300',
  low: 'bg-red-100 text-red-800 border border-red-300',
}

export function sortPlays(plays, categories, key, dir = 'asc') {
  const factor = dir === 'asc' ? 1 : -1
  const copy = [...plays]
  copy.sort((a, b) => {
    let av
    let bv
    if (key === 'total') {
      av = totalScore(a, categories)
      bv = totalScore(b, categories)
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

export function averageOfAll(plays, categories) {
  if (!plays.length) return 0
  const sum = plays.reduce((s, p) => s + totalScore(p, categories), 0)
  return sum / plays.length
}
