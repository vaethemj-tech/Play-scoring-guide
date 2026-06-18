import { RESEARCH_MODEL, WEB_SEARCH_TOOLS } from '../constants.js'
import { getScore, maxScore } from './scoring.js'

const API_URL = 'https://api.anthropic.com/v1/messages'

// Calls the Anthropic Messages API directly from the browser. The
// `anthropic-dangerous-direct-browser-access` header opts in to browser use;
// the API key is read from the user's localStorage settings and sent only to
// Anthropic.
async function callAnthropic(apiKey, body, signal) {
  let res
  try {
    res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(body),
      signal,
    })
  } catch (err) {
    if (err?.name === 'AbortError') throw err
    // Network-level failure (offline, CORS, ad-blocker, DNS, etc.)
    throw new Error(
      `Could not reach the Anthropic API (${err.message}). Check your connection, VPN, or ad-blocker.`,
    )
  }

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

Be efficient: perform at most 3 web searches total, then stop searching and write the report. Keep each field to 2–4 sentences.

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

Return ONLY a JSON object (no markdown, no code fences, no commentary before or after) with exactly these keys:
{
  "licensing": "1-2 sentences on licensing/royalty costs and how to obtain rights",
  "productionHistory": "1-2 sentences",
  "audienceReception": "1-2 sentences",
  "complexity": "1-2 sentences",
  "summary": "one short paragraph synthesizing the key takeaways for the board",
  "rightsCost": "the actual licensing/royalty price if stated anywhere, e.g. '$90 per performance' or '$1,200 for a 6-show package'. If no price is found, use 'Not listed'.",
  "rightsHolder": "the publisher/licensor if known (Dramatists Play Service, Concord Theatricals/Samuel French, Music Theatre International, Playscripts, etc.), otherwise an empty string",
  "rightsAvailability": "your best judgment of how easy the rights are to obtain — exactly one of: Easy, Moderate, Hard, Unknown",
  "complexityRating": "overall production complexity — exactly one of: Low, Medium, High, Unknown",
  "audienceAppealRating": "likely audience appeal for a community theater — exactly one of: High, Medium, Low, Unknown",
  "sources": [{"title": "...", "url": "..."}]
}

If a fact cannot be found, say so plainly (use 'Not listed' for rightsCost). Do not invent prices.`
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

// Normalizes a model-provided rating to one of the allowed values.
function normRating(value, allowed) {
  if (!value) return 'Unknown'
  const v = String(value).trim().toLowerCase()
  return allowed.find((a) => a.toLowerCase() === v) || 'Unknown'
}

const EMPTY_RESEARCH_EXTRAS = {
  rightsCost: '',
  rightsHolder: '',
  rightsAvailability: 'Unknown',
  complexityRating: 'Unknown',
  audienceAppealRating: 'Unknown',
}

// Looks like a tool-version / unsupported-tool error that warrants retrying
// with the stable web-search tool version.
function isToolVersionError(err) {
  return /web_search|input tag|does not match|not.?support|unexpected|tools?\.\d/i.test(
    err?.message || '',
  )
}

// Streams a Messages API request, accumulating the text content and the final
// stop_reason. Streaming keeps the connection alive during slow web-search work
// (a plain request stays silent and can hang for minutes). Aborts if no data
// arrives for `inactivityMs` — a genuine stall, distinct from steady progress.
async function streamMessage(apiKey, body, signal, inactivityMs = 75000) {
  let res
  try {
    res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({ ...body, stream: true }),
      signal,
    })
  } catch (err) {
    if (err?.name === 'AbortError') throw err
    throw new Error(
      `Could not reach the Anthropic API (${err.message}). Check your connection, VPN, or ad-blocker.`,
    )
  }

  if (!res.ok || !res.body) {
    let detail = ''
    try {
      const e = await res.json()
      detail = e?.error?.message || JSON.stringify(e)
    } catch {
      try {
        detail = await res.text()
      } catch {
        detail = ''
      }
    }
    throw new Error(`Anthropic API error (${res.status}): ${detail}`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let text = ''
  let stopReason = null
  let streamError = null

  // Race each read against an inactivity timeout so a stalled stream fails fast.
  const readChunk = () =>
    Promise.race([
      reader.read(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('__inactivity__')), inactivityMs),
      ),
    ])

  try {
    for (;;) {
      let chunk
      try {
        chunk = await readChunk()
      } catch (e) {
        if (e?.message === '__inactivity__') {
          throw new Error(
            `No response from web search for ${Math.round(inactivityMs / 1000)}s — the request stalled. Please try again.`,
          )
        }
        throw e
      }
      if (chunk.done) break
      buffer += decoder.decode(chunk.value, { stream: true })

      let sep
      while ((sep = buffer.indexOf('\n\n')) !== -1) {
        const eventChunk = buffer.slice(0, sep)
        buffer = buffer.slice(sep + 2)
        for (const line of eventChunk.split('\n')) {
          if (!line.startsWith('data:')) continue
          const payload = line.slice(5).trim()
          if (!payload || payload === '[DONE]') continue
          let evt
          try {
            evt = JSON.parse(payload)
          } catch {
            continue
          }
          if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
            text += evt.delta.text
          } else if (evt.type === 'message_delta' && evt.delta?.stop_reason) {
            stopReason = evt.delta.stop_reason
          } else if (evt.type === 'error') {
            streamError = evt.error?.message || 'stream error'
          }
        }
      }
    }
  } finally {
    try {
      reader.cancel()
    } catch {
      /* ignore */
    }
  }

  if (streamError) throw new Error(`Anthropic API error: ${streamError}`)
  return { text: text.trim(), stop_reason: stopReason }
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
  const body = (tool) => ({
    model: RESEARCH_MODEL,
    max_tokens: 4000,
    tools: [tool],
    messages: [{ role: 'user', content: prompt }],
  })

  // Overall ceiling so nothing runs forever; the per-read inactivity timeout in
  // streamMessage catches genuine stalls much sooner while letting a steadily
  // progressing search run to completion.
  const controller = new AbortController()
  const DEADLINE_MS = 240000 // 4 minutes
  const timer = setTimeout(() => controller.abort(), DEADLINE_MS)

  let result
  try {
    // Try the newer web-search tool first; if the account rejects that tool
    // version, retry once with the stable version.
    try {
      result = await streamMessage(apiKey, body(WEB_SEARCH_TOOLS[0]), controller.signal)
    } catch (err) {
      if (controller.signal.aborted || err?.name === 'AbortError') throw err
      if (isToolVersionError(err)) {
        result = await streamMessage(apiKey, body(WEB_SEARCH_TOOLS[1]), controller.signal)
      } else {
        throw err
      }
    }
  } catch (err) {
    if (controller.signal.aborted || err?.name === 'AbortError') {
      throw new Error('Research timed out after 4 minutes. Please try again.')
    }
    throw err
  } finally {
    clearTimeout(timer)
  }

  if (result.stop_reason === 'refusal') {
    throw new Error('The model declined to research this play.')
  }

  const data = parseJsonCandidate(result.text)

  if (!data) {
    if (result.stop_reason === 'max_tokens') {
      throw new Error(
        'The research response was cut off before it finished (length limit). Please try again.',
      )
    }
    if (!result.text) {
      throw new Error(
        'The model returned no readable text. If this persists, confirm web search is enabled for your account in the Anthropic Console.',
      )
    }
    // Graceful fallback: keep the raw text so the research isn't lost.
    return {
      licensing: '',
      productionHistory: '',
      audienceReception: '',
      complexity: '',
      summary: result.text,
      sources: [],
      ...EMPTY_RESEARCH_EXTRAS,
    }
  }

  return {
    licensing: data.licensing || '',
    productionHistory: data.productionHistory || '',
    audienceReception: data.audienceReception || '',
    complexity: data.complexity || '',
    summary: data.summary || '',
    sources: Array.isArray(data.sources) ? data.sources : [],
    rightsCost: data.rightsCost || '',
    rightsHolder: data.rightsHolder || '',
    rightsAvailability: normRating(data.rightsAvailability, ['Easy', 'Moderate', 'Hard']),
    complexityRating: normRating(data.complexityRating, ['Low', 'Medium', 'High']),
    audienceAppealRating: normRating(data.audienceAppealRating, ['High', 'Medium', 'Low']),
  }
}

function castText(play) {
  if (play.castMin && play.castMax) return `${play.castMin}-${play.castMax}`
  if (play.castMin) return `${play.castMin}+`
  if (play.castMax) return `up to ${play.castMax}`
  return 'unknown'
}

function buildComparePrompt(plays, settings) {
  const max = maxScore(settings)
  const sections = plays
    .map((p, i) => {
      const r = p.research
      const research = r
        ? [
            r.summary && `Summary: ${r.summary}`,
            r.licensing && `Licensing/royalties: ${r.licensing}`,
            r.productionHistory && `Recent production history: ${r.productionHistory}`,
            r.audienceReception && `Audience reception: ${r.audienceReception}`,
            r.complexity && `Production complexity/budget: ${r.complexity}`,
          ]
            .filter(Boolean)
            .join('\n')
        : 'No market research has been run for this play.'
      return `PLAY ${i + 1}: ${p.title || '(untitled)'}${p.playwright ? ' by ' + p.playwright : ''}
Score: ${getScore(p)} / ${max}
Genre: ${p.genre || 'unknown'} | Cast: ${castText(p)} | Runtime: ${p.runtime ? p.runtime + ' min' : 'unknown'}
Research:
${research}`
    })
    .join('\n\n---\n\n')

  return `You are advising the board of ${settings.theaterName || 'a community theater'} on which play(s) to program. Compare and contrast the plays below using BOTH their evaluation scores and their market research.

Cover the key trade-offs: artistic value, audience appeal, licensing cost and availability, production complexity and budget, and box-office potential. Note where the score and the research agree or disagree (e.g. a high score but expensive rights). Then give a clear recommendation that ranks the plays for the season, with a one-sentence rationale for the top choice.

Be concise and board-ready. Use short paragraphs or bullet points. Do not invent facts beyond the scores and research provided; if research is missing for a play, say so.

${sections}`
}

// Generates a board-ready compare-and-contrast write-up from the selected
// plays' scores and saved research. Plain text call (no web search) — fast.
export async function runComparison(plays, settings) {
  const apiKey = settings.apiKey?.trim()
  if (!apiKey) {
    throw new Error('No Anthropic API key set. Add one in Settings to generate an AI comparison.')
  }
  if (!plays || plays.length < 2) {
    throw new Error('Select at least two plays to compare.')
  }

  const res = await callAnthropic(apiKey, {
    model: RESEARCH_MODEL,
    max_tokens: 2000,
    messages: [{ role: 'user', content: buildComparePrompt(plays, settings) }],
  })

  const text = (res.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim()

  if (!text) throw new Error('The model returned no comparison text. Please try again.')
  return text
}
