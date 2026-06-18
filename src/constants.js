// Plays are scored externally (against a standard rubric) and the already-
// received total is entered into the app. The default maximum is 80
// (the standard 8-category × 10 rubric), adjustable in Settings.
export const DEFAULT_MAX_SCORE = 80

export const GENRES = [
  'Drama',
  'Comedy',
  'Musical',
  'Tragedy',
  'Farce',
  'Mystery/Thriller',
  'Historical',
  'Romance',
  'Experimental',
  'Children/Family',
  'Other',
]

export const DEFAULT_SETTINGS = {
  theaterName: '',
  seasonYear: String(new Date().getFullYear() + 1),
  apiKey: '',
  maxScore: DEFAULT_MAX_SCORE,
}

// The model and web-search tool used for AI market research.
export const RESEARCH_MODEL = 'claude-sonnet-4-6'
export const WEB_SEARCH_TOOL = { type: 'web_search_20260209', name: 'web_search', max_uses: 6 }

export const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'plays', label: 'Add / Edit Plays' },
  { id: 'research', label: 'Research' },
  { id: 'settings', label: 'Settings' },
  { id: 'export', label: 'Export' },
]
