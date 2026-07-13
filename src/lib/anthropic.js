import { RESEARCH_MODEL, WEB_SEARCH_TOOLS, FIT_CATEGORIES, SEASON_FACTORS } from '../constants.js'
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

  return `You are a market research assistant and programming advisor for a theater. Use web search to research the play below, then return a single structured report AND a venue-fit score.

Be efficient: perform at most 3 web searches total, then stop searching and write the report. Keep each field to 2–4 sentences.

PLAY
- Title: ${play.title || '(untitled)'}
- Playwright: ${play.playwright || 'unknown'}
- Genre: ${play.genre || 'unknown'}
- Year written: ${play.yearWritten || 'unknown'}
- Cast size: ${play.castMin || '?'}–${play.castMax || '?'}
- Runtime: ${play.runtime ? play.runtime + ' min' : 'unknown'}

VENUE (score how well this play fits THIS specific venue and audience):
- Type: ${settings.venueType || 'community theater'}
- Location: ${settings.venueLocation || 'unknown'}
- Audience & space notes: ${settings.audienceNotes || 'n/a'}

Research and report on, with reference to ${market}:
1. Current licensing/royalty costs from major publishers (Samuel French / Concord Theatricals, Dramatists Play Service, Music Theatre International, Playscripts). Include amateur/community per-performance or package costs where available.
2. Recent production history at comparable community or regional theaters.
3. Audience reception notes and reviews from similar-sized markets.
4. Known production complexity or budget considerations (set, cast, technical, music).
5. The playwright's notoriety and reputation — major awards, how widely produced, and public name recognition — and whether the play is adapted from a well-known book, film, or other property, noting how much recognizable-title / built-in-audience draw that brings.

Then score the play's fit for the venue above on a 1–10 scale per category (10 = excellent fit), grounded in the research and the venue/audience notes:
- audienceEngagement: suits an intimate, immersive black-box-style space
- demographicAppeal: resonates with this location's community audience; give weight to a recognizable playwright and to familiar source material
- stagingFit: works within a flexible/minimal set, small cast, limited wing/fly space
- affordability: driven PRIMARILY by the actual licensing/royalty price you found (the same figure you put in rightsCost), plus production budget. Guide: clearly low/nominal rights (roughly under ~$100 per performance, or a small flat package) = 8–10; moderate (~$100–175 per performance) = 5–7; high or premium (large musicals, heavy royalties, roughly over ~$200 per performance) = 1–4. If no price is listed, estimate from the publisher and type of show, lean conservative, and do NOT default to a high score. This score MUST be consistent with rightsCost — an expensive show cannot score high on affordability.
- localDraw: likely to sell tickets in this local market — give meaningful weight to the playwright's fame and to recognizable source material (a play adapted from a popular book or film carries built-in title recognition that boosts draw)

Keep the fit scores internally consistent with the research (affordability with rightsCost, stagingFit with production complexity).

Return ONLY a JSON object (no markdown, no code fences, no commentary before or after) with exactly these keys:
{
  "synopsis": "a neutral 2-3 sentence plot synopsis of the play",
  "licensing": "1-2 sentences on licensing/royalty costs and how to obtain rights",
  "productionHistory": "1-2 sentences",
  "audienceReception": "1-2 sentences",
  "complexity": "1-2 sentences",
  "playwrightNotoriety": "1 sentence on how recognized the playwright is (awards, how widely produced) and what draw their name carries",
  "sourceMaterial": "if adapted from a book, film, or other property, name it and note the title-recognition draw; if not, use 'Original work'",
  "summary": "one short paragraph synthesizing the key takeaways for the board, including any name-recognition or source-material draw",
  "rightsCost": "the actual licensing/royalty price if stated anywhere, e.g. '$90 per performance' or '$1,200 for a 6-show package'. If no price is found, use 'Not listed'.",
  "rightsHolder": "the publisher/licensor if known (Dramatists Play Service, Concord Theatricals/Samuel French, Music Theatre International, Playscripts, etc.), otherwise an empty string",
  "rightsAvailability": "your best judgment of how easy the rights are to obtain — exactly one of: Easy, Moderate, Hard, Unknown",
  "complexityRating": "overall production complexity — exactly one of: Low, Medium, High, Unknown",
  "audienceAppealRating": "likely audience appeal for a community theater — exactly one of: High, Medium, Low, Unknown",
  "fit": {
    "audienceEngagement": 1-10,
    "demographicAppeal": 1-10,
    "stagingFit": 1-10,
    "affordability": 1-10,
    "localDraw": 1-10,
    "notes": "one sentence on overall fit for this venue and audience"
  },
  "sources": [{"title": "...", "url": "..."}]
}

If a fact cannot be found, say so plainly (use 'Not listed' for rightsCost). Do not invent prices. Always provide the fit scores using your best judgment.`
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
  synopsis: '',
  rightsCost: '',
  rightsHolder: '',
  rightsAvailability: 'Unknown',
  complexityRating: 'Unknown',
  audienceAppealRating: 'Unknown',
  playwrightNotoriety: '',
  sourceMaterial: '',
  fit: null,
}

// Normalizes the venue-fit object: each category clamped to an integer 1–10.
// Returns null if no usable scores were provided.
function normFit(fit) {
  if (!fit || typeof fit !== 'object') return null
  const out = { notes: typeof fit.notes === 'string' ? fit.notes : '' }
  let any = false
  for (const c of FIT_CATEGORIES) {
    const v = Number(fit[c.id])
    if (Number.isFinite(v)) {
      out[c.id] = Math.min(10, Math.max(1, Math.round(v)))
      any = true
    } else {
      out[c.id] = 0
    }
  }
  return any ? out : null
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
    synopsis: data.synopsis || '',
    licensing: data.licensing || '',
    productionHistory: data.productionHistory || '',
    audienceReception: data.audienceReception || '',
    complexity: data.complexity || '',
    playwrightNotoriety: data.playwrightNotoriety || '',
    sourceMaterial: data.sourceMaterial || '',
    summary: data.summary || '',
    sources: Array.isArray(data.sources) ? data.sources : [],
    rightsCost: data.rightsCost || '',
    rightsHolder: data.rightsHolder || '',
    rightsAvailability: normRating(data.rightsAvailability, ['Easy', 'Moderate', 'Hard']),
    complexityRating: normRating(data.complexityRating, ['Low', 'Medium', 'High']),
    audienceAppealRating: normRating(data.audienceAppealRating, ['High', 'Medium', 'Low']),
    fit: normFit(data.fit),
  }
}

function castText(play) {
  if (play.castMin && play.castMax) return `${play.castMin}-${play.castMax}`
  if (play.castMin) return `${play.castMin}+`
  if (play.castMax) return `up to ${play.castMax}`
  return 'unknown'
}

function fitLine(play) {
  const f = play?.research?.fit
  if (!f) return 'Venue-fit score: not yet scored'
  const total = FIT_CATEGORIES.reduce((s, c) => s + (Number(f[c.id]) || 0), 0)
  const parts = FIT_CATEGORIES.map((c) => `${c.label} ${f[c.id] || 0}/10`).join(', ')
  return `Venue-fit score: ${total}/${FIT_CATEGORIES.length * 10} (${parts})`
}

function buildComparePrompt(plays, settings) {
  const max = maxScore(settings)
  const sections = plays
    .map((p, i) => {
      const r = p.research
      const research = r
        ? [
            r.summary && `Summary: ${r.summary}`,
            r.playwrightNotoriety && `Playwright recognition: ${r.playwrightNotoriety}`,
            r.sourceMaterial && `Source material/draw: ${r.sourceMaterial}`,
            r.licensing && `Licensing/royalties: ${r.licensing}`,
            r.productionHistory && `Recent production history: ${r.productionHistory}`,
            r.audienceReception && `Audience reception: ${r.audienceReception}`,
            r.complexity && `Production complexity/budget: ${r.complexity}`,
          ]
            .filter(Boolean)
            .join('\n')
        : 'No market research has been run for this play.'
      return `PLAY ${i + 1}: ${p.title || '(untitled)'}${p.playwright ? ' by ' + p.playwright : ''}
Board score (subjective): ${getScore(p)} / ${max}
${fitLine(p)}
Genre: ${p.genre || 'unknown'} | Cast: ${castText(p)} | Runtime: ${p.runtime ? p.runtime + ' min' : 'unknown'}
Research:
${research}`
    })
    .join('\n\n---\n\n')

  return `You are advising the board of ${settings.theaterName || 'a community theater'} on which play(s) to program for their venue: a ${settings.venueType || 'community theater'} in ${settings.venueLocation || 'their area'}. Audience & space: ${settings.audienceNotes || 'n/a'}.

Compare and contrast the plays below using ALL of: the board's subjective score, the venue-fit score (how well each suits this specific space and audience), and the market research.

Cover the key trade-offs: artistic value, audience/demographic appeal, licensing cost and availability, staging fit for the venue, production budget, and local box-office potential. Note where the signals agree or disagree (e.g. a high board score but weak venue fit, or great fit but expensive rights). Then give a clear recommendation that ranks the plays for the season, with a one-sentence rationale for the top choice.

Be concise and board-ready. Use short paragraphs or bullet points. Do not invent facts beyond what's provided; if research is missing for a play, say so.

${sections}`
}

function showFacts(p) {
  if (!p) return null
  const r = p.research
  return [
    `Title: ${p.title || '(untitled)'}${p.playwright ? ' by ' + p.playwright : ''}`,
    `Genre: ${p.genre || 'unknown'}`,
    `Cast size: ${p.castMin || '?'}–${p.castMax || '?'}`,
    `Year written: ${p.yearWritten || 'unknown'}`,
    `Runtime: ${p.runtime ? p.runtime + ' min' : 'unknown'}`,
    p.staging ? `Staging notes: ${p.staging}` : null,
    r?.summary ? `Research summary: ${r.summary}` : null,
    r?.complexity ? `Production complexity: ${r.complexity}` : null,
    r ? `Ratings — complexity: ${r.complexityRating}, audience appeal: ${r.audienceAppealRating}` : null,
  ]
    .filter(Boolean)
    .join('\n')
}

// Auto-fills the Season Balance Matrix factor values for the given shows
// (array of up to 3 play objects, by slot). Plain text JSON call — fast.
export async function runSeasonMatrix(shows, settings) {
  const apiKey = settings.apiKey?.trim()
  if (!apiKey) throw new Error('No Anthropic API key set. Add one in Settings to auto-fill.')

  const slots = ['show1', 'show2', 'show3']
  const present = slots.filter((s, i) => shows[i])
  if (!present.length) throw new Error('Pick at least one show to auto-fill.')

  const showBlocks = slots
    .map((slot, i) => (shows[i] ? `=== ${slot} ===\n${showFacts(shows[i])}` : null))
    .filter(Boolean)
    .join('\n\n')

  const factorList = SEASON_FACTORS.map((f) => `- ${f.id}: ${f.label}`).join('\n')

  const prompt = `You are filling a theater "Season Balance Matrix". For each show below, give a SHORT value (a word or brief phrase) for each factor. Where a factor lists options in parentheses, choose one of those options. Base your answers on the show's details and research; use your theater knowledge where details are missing.

FACTORS:
${factorList}

SHOWS:
${showBlocks}

Return ONLY a JSON object (no markdown) with one key per show slot that was provided (${present.join(', ')}). Each maps to an object whose keys are the factor ids above and whose values are short strings. Example shape:
{ "show1": { "genre": "Comedy", "tone": "Comedy", "castSize": "Medium 7–12", "genderBalance": "Balanced", "techComplexity": "Low", "setComplexity": "Single set", "costume": "Modern, low", "audienceDraw": "High", "artisticRisk": "Low", "timePeriod": "Contemporary", "specialNeeds": "None" } }`

  const res = await callAnthropic(apiKey, {
    model: RESEARCH_MODEL,
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }],
  })
  const text = (res.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
  const data = parseJsonCandidate(text)
  if (!data) throw new Error('Could not read the auto-fill result. Please try again.')
  return data // { show1: {factorId: value}, ... }
}

// Reviews the balance of the season matrix and recommends the Wildcard slot.
export async function runBalanceReview(matrix, shows, settings) {
  const apiKey = settings.apiKey?.trim()
  if (!apiKey) throw new Error('No Anthropic API key set. Add one in Settings for the AI review.')

  const wildcardLabel = matrix.wildcardLabel?.trim() || 'Wildcard'
  const slots = ['show1', 'show2', 'show3', 'wildcard']
  const titleFor = (s, i) => (s === 'wildcard' ? wildcardLabel : shows[i]?.title || s)
  const lines = SEASON_FACTORS.map((f) => {
    const vals = slots.map((s, i) => `${titleFor(s, i)}: ${matrix.values?.[f.id]?.[s] || '—'}`)
    return `${f.label} -> ${vals.join(' | ')}`
  }).join('\n')

  const prompt = `You are a theater programming advisor for ${settings.theaterName || 'a community theater'} (${settings.venueType || 'venue'}${settings.venueLocation ? ', ' + settings.venueLocation : ''}). Review the balance of this season. The fourth slot ("${wildcardLabel}") is the flexible/open slot — if it already has values, factor them in; if it is blank, recommend what it should provide.

SEASON MATRIX (factor -> each show's value):
${lines}

Assess the season's overall balance and variety across genre, tone, cast size, technical/set/costume demands, audience draw, artistic risk, and time period. Point out redundancy (too much of one thing) and gaps (what's missing). Then recommend specifically what the WILDCARD show should provide to balance the season (e.g. "a small-cast contemporary drama to offset two large musicals"). Be concise and board-ready — short paragraphs or bullets.`

  const res = await callAnthropic(apiKey, {
    model: RESEARCH_MODEL,
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }],
  })
  const text = (res.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim()
  if (!text) throw new Error('The model returned no review. Please try again.')
  return text
}

// Given one "seed" show, recommends two more shows to build a balanced season
// (the Wildcard stays open). Prefers the theater's own entered plays where they
// fit, and may suggest well-known titles otherwise. Plain text call — fast.
export async function runSeasonRecommendation(seed, otherPlays, settings) {
  const apiKey = settings.apiKey?.trim()
  if (!apiKey) {
    throw new Error('No Anthropic API key set. Add one in Settings for recommendations.')
  }
  if (!seed) throw new Error('Pick a show to build the season around first.')

  const candidates =
    (otherPlays || [])
      .filter((p) => p.id !== seed.id)
      .map(
        (p) =>
          `- ${p.title || '(untitled)'}${p.playwright ? ' by ' + p.playwright : ''} (${p.genre || 'genre?'}, cast ${p.castMin || '?'}–${p.castMax || '?'})`,
      )
      .join('\n') || '(none entered yet)'

  const prompt = `You are a theater programming advisor for ${settings.theaterName || 'a community theater'} (${settings.venueType || 'venue'}${settings.venueLocation ? ', ' + settings.venueLocation : ''}). Audience & space: ${settings.audienceNotes || 'n/a'}.

The board has chosen this show for the season:
${showFacts(seed)}

Recommend TWO additional shows that, together with the chosen show, make a well-balanced three-show season — varied across genre, tone, cast size, technical/set demands, audience draw, artistic risk, and time period. A fourth "Wildcard" slot will stay open, so do NOT fill it.

The theater's other already-entered candidate plays:
${candidates}

Prefer recommending from those candidates when one is a strong fit (name it exactly). If none fit a needed gap well, you may suggest a well-known title instead and say so. For each of the two recommendations, give the title and a one-sentence rationale tied to balancing the season. End with one sentence on what the still-open Wildcard could add. Be concise and board-ready.`

  const res = await callAnthropic(apiKey, {
    model: RESEARCH_MODEL,
    max_tokens: 1200,
    messages: [{ role: 'user', content: prompt }],
  })
  const text = (res.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim()
  if (!text) throw new Error('The model returned no recommendation. Please try again.')
  return text
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
