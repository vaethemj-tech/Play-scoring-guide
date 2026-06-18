import { RESEARCH_MODEL, WEB_SEARCH_TOOLS } from '../constants.js'

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

// Attempts to parse a JSON object out of a text candidate. Strips Markdown code
// fences and takes the outermost { … }. Returns null on failure (never throws).
function parseJsonCandidate(text) {
  if (!text) return null
  const cleaned = text.replace(/```json/gi, '').replace(/```/g, '')
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1 || end === -1 || end < start) return null
  try {
    return JSON.parse(cleaned.slice(start, end + 1))
  } catch {
    return null
  }
}

function textBlocks(content) {
  return (content || []).filter((b) => b.type === 'text').map((b) => b.text)
}

// Looks like a tool-version / unsupported-tool error that warrants retrying
// with the stable web-search tool version.
function isToolVersionError(err) {
  return /web_search|input tag|does not match|not.?support|unexpected|tools?\.\d/i.test(
    err?.message || '',
  )
}

// Runs the research conversation with a given web-search tool, resuming through
// any `pause_turn` pauses the server-side search loop produces.
async function runConversation(apiKey, prompt, tool) {
  let messages = [{ role: 'user', content: prompt }]
  let response
  for (let i = 0; i < 8; i++) {
    response = await callAnthropic(apiKey, {
      model: RESEARCH_MODEL,
      max_tokens: 8000,
      tools: [tool],
      messages,
    })
    if (response.stop_reason === 'pause_turn') {
      messages = [...messages, { role: 'assistant', content: response.content }]
      continue
    }
    break
  }
  return response
}

// Runs AI-powered market research for a single play. Returns the parsed
// research object (licensing, productionHistory, audienceReception,
// complexity, summary, sources).
export async function runResearch(play, settings) {
  const apiKey = settings.apiKey?.trim()
  if (!apiKey) {
    throw new Error('No Anthropic API key set. Add one in Settings before running research.')
  }

  const prompt = buildPrompt(play, settings)

  // Try the newer web-search tool first; if the account rejects that tool
  // version, retry once with the stable version.
  let response
  try {
    response = await runConversation(apiKey, prompt, WEB_SEARCH_TOOLS[0])
  } catch (err) {
    if (isToolVersionError(err)) {
      response = await runConversation(apiKey, prompt, WEB_SEARCH_TOOLS[1])
    } else {
      throw err
    }
  }

  if (response.stop_reason === 'refusal') {
    throw new Error('The model declined to research this play.')
  }

  // The final answer is normally the last text block; fall back to the joined
  // text if needed.
  const blocks = textBlocks(response.content)
  const joined = blocks.join('\n').trim()
  const data =
    parseJsonCandidate(blocks[blocks.length - 1]) || parseJsonCandidate(joined)

  if (!data) {
    if (response.stop_reason === 'max_tokens') {
      throw new Error(
        'The research response was cut off before it finished (length limit). Please try again.',
      )
    }
    if (!joined) {
      throw new Error(
        'The model returned no readable text. This usually means web search is not enabled for your API key — check your Anthropic Console plan/billing.',
      )
    }
    // Graceful fallback: keep the raw text so the research isn't lost.
    return {
      licensing: '',
      productionHistory: '',
      audienceReception: '',
      complexity: '',
      summary: joined,
      sources: [],
    }
  }

  return {
    licensing: data.licensing || '',
    productionHistory: data.productionHistory || '',
    audienceReception: data.audienceReception || '',
    complexity: data.complexity || '',
    summary: data.summary || '',
    sources: Array.isArray(data.sources) ? data.sources : [],
  }
}
