import { RESEARCH_MODEL, WEB_SEARCH_TOOL } from '../constants.js'

const API_URL = 'https://api.anthropic.com/v1/messages'

// Calls the Anthropic Messages API directly from the browser. The
// `anthropic-dangerous-direct-browser-access` header opts in to browser use;
// the API key is read from the user's localStorage settings and sent only to
// Anthropic.
async function callAnthropic(apiKey, body) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    let detail = ''
    try {
      const err = await res.json()
      detail = err?.error?.message || JSON.stringify(err)
    } catch {
      detail = await res.text()
    }
    throw new Error(`Anthropic API error (${res.status}): ${detail}`)
  }
  return res.json()
}

// Makes a minimal API call to confirm the key works and the browser can reach
// the Anthropic API. Throws with a descriptive message on failure.
export async function testApiKey(apiKey) {
  const key = apiKey?.trim()
  if (!key) throw new Error('No API key provided.')
  await callAnthropic(key, {
    model: RESEARCH_MODEL,
    max_tokens: 16,
    messages: [{ role: 'user', content: 'Reply with the single word: ok' }],
  })
  return true
}

function buildPrompt(play, settings) {
  const market = settings.theaterName
    ? `the community/regional theater market relevant to "${settings.theaterName}"`
    : 'community and regional theater markets'

  return `You are a market research assistant for a community theater board. Use web search to research the play below, then return a single structured report.

PLAY
- Title: ${play.title || '(untitled)'}
- Playwright: ${play.playwright || 'unknown'}
- Genre: ${play.genre || 'unknown'}
- Year written: ${play.yearWritten || 'unknown'}

Research and report on, with reference to ${market}:
1. Current licensing/royalty costs from major publishers (Samuel French / Concord Theatricals, Dramatists Play Service, Music Theatre International, Playscripts). Include amateur/community per-performance or package costs where available.
2. Recent production history at comparable community or regional theaters.
3. Audience reception notes and reviews from similar-sized markets.
4. Known production complexity or budget considerations (set, cast, technical, music).

Return ONLY a JSON object (no markdown, no code fences, no commentary before or after) with exactly these string keys, each a concise paragraph or two:
{
  "licensing": "...",
  "productionHistory": "...",
  "audienceReception": "...",
  "complexity": "...",
  "summary": "one short paragraph synthesizing the key takeaways for the board",
  "sources": [{"title": "...", "url": "..."}]
}

If a fact cannot be found, say so plainly in the relevant field rather than inventing it.`
}

function extractJson(text) {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1 || end < start) {
    throw new Error('Could not find a JSON object in the model response.')
  }
  return JSON.parse(text.slice(start, end + 1))
}

function collectText(content) {
  return (content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
}

// Runs AI-powered market research for a single play. Returns the parsed
// research object (licensing, productionHistory, audienceReception,
// complexity, summary, sources).
export async function runResearch(play, settings) {
  const apiKey = settings.apiKey?.trim()
  if (!apiKey) {
    throw new Error('No Anthropic API key set. Add one in Settings before running research.')
  }

  let messages = [{ role: 'user', content: buildPrompt(play, settings) }]
  let response

  // The web-search server tool runs a multi-step loop; it may return
  // `pause_turn` when it hits its internal iteration limit. Re-send to resume.
  for (let i = 0; i < 8; i++) {
    response = await callAnthropic(apiKey, {
      model: RESEARCH_MODEL,
      max_tokens: 4000,
      tools: [WEB_SEARCH_TOOL],
      messages,
    })
    if (response.stop_reason === 'pause_turn') {
      messages = [...messages, { role: 'assistant', content: response.content }]
      continue
    }
    break
  }

  if (response.stop_reason === 'refusal') {
    throw new Error('The model declined to research this play.')
  }

  const text = collectText(response.content)
  const data = extractJson(text)

  return {
    licensing: data.licensing || '',
    productionHistory: data.productionHistory || '',
    audienceReception: data.audienceReception || '',
    complexity: data.complexity || '',
    summary: data.summary || '',
    sources: Array.isArray(data.sources) ? data.sources : [],
  }
}
