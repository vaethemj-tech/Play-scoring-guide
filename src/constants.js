// Default scoring rubric. Each category is scored 1–10; the total is the
// weight-multiplied sum. Labels and weights are editable in Settings.
export const DEFAULT_CATEGORIES = [
  { id: 'artistic_merit', label: 'Artistic Merit', description: 'Quality of script, dialogue, and dramatic structure', weight: 1 },
  { id: 'audience_appeal', label: 'Audience Appeal', description: "Likely resonance with your theater's audience demographic", weight: 1 },
  { id: 'production_feasibility', label: 'Production Feasibility', description: 'Stageable within your space, budget, and tech capabilities', weight: 1 },
  { id: 'casting_availability', label: 'Casting Availability', description: 'Realistic to cast from your community talent pool', weight: 1 },
  { id: 'rights_availability', label: 'Rights Availability', description: 'Ease of obtaining rights in your market/timeframe', weight: 1 },
  { id: 'thematic_relevance', label: 'Thematic Relevance', description: 'Alignment with season theme or community moment', weight: 1 },
  { id: 'box_office_potential', label: 'Box Office Potential', description: 'Expected ticket sales and revenue potential', weight: 1 },
  { id: 'sponsor_appeal', label: 'Sponsor Appeal', description: 'Likelihood of attracting sponsorship or partnership interest', weight: 1 },
]

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
  categories: DEFAULT_CATEGORIES,
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
