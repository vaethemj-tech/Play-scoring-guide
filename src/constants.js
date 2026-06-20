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
  // Venue profile — grounds the AI venue-fit scoring.
  venueType: 'Black box theatre',
  venueLocation: 'Lindenhurst, Long Island, NY',
  audienceNotes:
    'Intimate flexible black box (~50–100 seats). Suburban Long Island community audience: multi-generational, families and older adults, value-conscious, drawn to recognizable titles, comedies, musicals, and relatable contemporary drama. Limited wing/fly space and a modest production budget.',
  // How much the user's own score counts vs. the AI venue-fit score (0–100).
  scoreBlend: 50,
  // Optional team cloud sync (Supabase). Empty = local-only.
  supabaseUrl: '',
  supabaseKey: '',
  boardCode: '',
  // Shown to teammates as who's online / who edited (local identity).
  memberName: 'Board member',
}

// Visible build tag so it's unambiguous which deployed version is loaded.
export const APP_VERSION = '20'

// AI venue-fit scoring categories (each rated 1–10 for the user's venue).
export const FIT_CATEGORIES = [
  { id: 'audienceEngagement', label: 'Audience Engagement' },
  { id: 'demographicAppeal', label: 'Local Demographic Appeal' },
  { id: 'stagingFit', label: 'Black Box Staging Fit' },
  { id: 'affordability', label: 'Affordability (rights + budget)' },
  { id: 'localDraw', label: 'Local Box-Office Draw' },
]
export const FIT_MAX = FIT_CATEGORIES.length * 10

// Rows of the Season Balance Matrix.
export const SEASON_FACTORS = [
  { id: 'genre', label: 'Genre' },
  { id: 'tone', label: 'Tone (Comedy / Drama / Thriller / Musical)' },
  { id: 'castSize', label: 'Cast Size (Small 2–6 / Medium 7–12 / Large 13+)' },
  { id: 'genderBalance', label: 'Gender Balance of Roles' },
  { id: 'techComplexity', label: 'Technical Complexity (Low / Medium / High)' },
  { id: 'setComplexity', label: 'Set Complexity' },
  { id: 'costume', label: 'Costume Demands' },
  { id: 'audienceDraw', label: 'Audience Draw (Low / Medium / High)' },
  { id: 'artisticRisk', label: 'Artistic Risk' },
  { id: 'timePeriod', label: 'Time Period (Classic / Modern / Contemporary)' },
  { id: 'specialNeeds', label: 'Special Production Needs' },
]
// The three fillable show columns (the Wildcard column is always left blank).
export const MATRIX_SLOTS = ['show1', 'show2', 'show3']

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
  { id: 'matrix', label: 'Season Balance' },
  { id: 'settings', label: 'Settings' },
  { id: 'export', label: 'Export' },
]
