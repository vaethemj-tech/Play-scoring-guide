// Cloud sync via Supabase's REST API (PostgREST). Kept dependency-free — plain
// fetch against the user's own Supabase project. The whole shared board is one
// row in a `boards` table: { id (board code), data (jsonb), updated_at }.
//
// Only shared data lives in the cloud (plays + shared settings). Each member's
// Anthropic API key and their connection settings stay local on their device.

export function cloudConfigured(s) {
  return Boolean(s?.supabaseUrl?.trim() && s?.supabaseKey?.trim() && s?.boardCode?.trim())
}

function base(s) {
  return s.supabaseUrl.trim().replace(/\/+$/, '')
}

function headers(s) {
  const key = s.supabaseKey.trim()
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'content-type': 'application/json',
  }
}

// The subset of app state shared across the team.
export function buildSharedData(plays, settings, matrix) {
  return {
    plays,
    matrix,
    shared: {
      theaterName: settings.theaterName,
      seasonYear: settings.seasonYear,
      maxScore: settings.maxScore,
      venueType: settings.venueType,
      venueLocation: settings.venueLocation,
      audienceNotes: settings.audienceNotes,
      scoreBlend: settings.scoreBlend,
    },
  }
}

async function readError(res) {
  try {
    const j = await res.json()
    return j?.message || j?.hint || JSON.stringify(j)
  } catch {
    try {
      return await res.text()
    } catch {
      return `HTTP ${res.status}`
    }
  }
}

// Fetches the shared board row, or null if it doesn't exist yet.
export async function cloudLoad(s) {
  const url = `${base(s)}/rest/v1/boards?id=eq.${encodeURIComponent(
    s.boardCode.trim(),
  )}&select=data,updated_at`
  let res
  try {
    res = await fetch(url, { headers: headers(s) })
  } catch (e) {
    throw new Error(`Could not reach the cloud (${e.message}).`)
  }
  if (!res.ok) {
    throw new Error(`Cloud load failed (${res.status}): ${await readError(res)}`)
  }
  const rows = await res.json()
  return rows[0] || null // { data, updated_at } | null
}

// ---- Presence (who's online) ----
// Reuses the same `boards` table: each member writes a small row keyed
// `<boardCode>::presence::<memberId>` with their name + last-seen time, so no
// extra database setup is needed.

function presencePrefix(s) {
  return `${s.boardCode.trim()}::presence::`
}

export async function cloudHeartbeat(s, memberId, name) {
  const url = `${base(s)}/rest/v1/boards?on_conflict=id`
  const row = {
    id: `${presencePrefix(s)}${memberId}`,
    data: { name: name || 'Board member', lastSeen: Date.now() },
    updated_at: new Date().toISOString(),
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { ...headers(s), Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify(row),
  })
  if (!res.ok) throw new Error(`Heartbeat failed (${res.status})`)
}

// Returns [{ memberId, name, lastSeen }] for everyone on this board.
export async function cloudPresence(s) {
  const prefix = presencePrefix(s)
  const url = `${base(s)}/rest/v1/boards?id=like.${encodeURIComponent(prefix)}*&select=id,data`
  const res = await fetch(url, { headers: headers(s) })
  if (!res.ok) throw new Error(`Presence load failed (${res.status})`)
  const rows = await res.json()
  return rows.map((r) => ({
    memberId: r.id.slice(prefix.length),
    name: r.data?.name || 'Member',
    lastSeen: r.data?.lastSeen || 0,
  }))
}

// Upserts the shared board row. Returns the new updated_at timestamp.
export async function cloudSave(s, data) {
  const updated_at = new Date().toISOString()
  const url = `${base(s)}/rest/v1/boards?on_conflict=id`
  let res
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { ...headers(s), Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify({ id: s.boardCode.trim(), data, updated_at }),
    })
  } catch (e) {
    throw new Error(`Could not reach the cloud (${e.message}).`)
  }
  if (!res.ok) {
    throw new Error(`Cloud save failed (${res.status}): ${await readError(res)}`)
  }
  const rows = await res.json()
  return rows[0]?.updated_at || updated_at
}
