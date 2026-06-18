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

// Visible build tag so it's unambiguous which deployed version is loaded.
export const APP_VERSION = '9'

// The model and web-search tools used for AI market research. The newer tool
// version is tried first; if an account doesn't accept it, research falls back
// to the stable version.
export const RESEARCH_MODEL = 'claude-sonnet-4-6'
export const WEB_SEARCH_TOOLS = [
  // Stable version first: it returns results directly (no extra result-filtering
  // code step), which is noticeably faster. The newer version is the fallback.
  { type: 'web_search_20250305', name: 'web_search', max_uses: 3 },
  { type: 'web_search_20260209', name: 'web_search', max_uses: 3 },
]

export const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'plays', label: 'Add / Edit Plays' },
  { id: 'research', label: 'Research' },
  { id: 'compare', label: 'Compare' },
  { id: 'settings', label: 'Settings' },
  { id: 'export', label: 'Export' },
]
