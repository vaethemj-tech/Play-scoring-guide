import { useEffect, useRef, useState } from 'react'
import Nav from './components/Nav.jsx'
import Dashboard from './components/Dashboard.jsx'
import PlaysManager from './components/PlaysManager.jsx'
import Research from './components/Research.jsx'
import Compare from './components/Compare.jsx'
import SeasonMatrix from './components/SeasonMatrix.jsx'
import Settings from './components/Settings.jsx'
import Export from './components/Export.jsx'
import SyncBar from './components/SyncBar.jsx'
import { useToast } from './components/Toast.jsx'
import {
  loadPlays,
  savePlays,
  loadSettings,
  saveSettings,
  clearAll,
  loadMemberId,
  loadMatrices,
  saveMatrices,
  emptyMatrix,
  normalizeMatrices,
} from './lib/storage.js'
import {
  cloudConfigured,
  cloudLoad,
  cloudSave,
  buildSharedData,
  cloudHeartbeat,
  cloudPresence,
} from './lib/cloud.js'
import { DEFAULT_SETTINGS, APP_VERSION } from './constants.js'

const SYNC_LABEL = {
  off: 'Local only',
  connecting: 'Connecting…',
  synced: 'Synced with team ✓',
  error: 'Sync error',
}

export default function App() {
  const toast = useToast()
  const [tab, setTab] = useState('dashboard')
  const [plays, setPlays] = useState(() => loadPlays())
  const [settings, setSettings] = useState(() => loadSettings())
  const [matrices, setMatrices] = useState(() => loadMatrices())
  const [syncStatus, setSyncStatus] = useState('off')
  const [online, setOnline] = useState([])
  const [boardUpdatedAt, setBoardUpdatedAt] = useState(null)
  const [memberId] = useState(() => loadMemberId())

  // Cloud-sync bookkeeping (refs so changes don't re-trigger effects).
  const lastUpdatedAt = useRef(null)
  const lastSyncedJson = useRef(null)
  const ready = useRef(false)

  // Persist to localStorage so data survives a refresh and works offline.
  useEffect(() => {
    savePlays(plays)
  }, [plays])
  useEffect(() => {
    saveSettings(settings)
  }, [settings])
  useEffect(() => {
    saveMatrices(matrices)
  }, [matrices])

  // Applies a shared board payload from the cloud into local state. Records the
  // payload hash so the save effect treats the resulting state change as an echo.
  function applyCloud(data) {
    if (!data) return
    lastSyncedJson.current = JSON.stringify(data)
    if (Array.isArray(data.plays)) setPlays(data.plays)
    if (data.shared && typeof data.shared === 'object') {
      setSettings((prev) => ({ ...prev, ...data.shared }))
    }
    if (Array.isArray(data.matrices)) setMatrices(normalizeMatrices(data.matrices))
    else if (data.matrix) setMatrices(normalizeMatrices([data.matrix]))
  }

  // Connect (and reconnect when the connection settings change).
  useEffect(() => {
    ready.current = false
    if (!cloudConfigured(settings)) {
      setSyncStatus('off')
      lastUpdatedAt.current = null
      lastSyncedJson.current = null
      return
    }
    let cancelled = false
    setSyncStatus('connecting')
    ;(async () => {
      try {
        const row = await cloudLoad(settings)
        if (cancelled) return
        if (row) {
          lastUpdatedAt.current = row.updated_at
          setBoardUpdatedAt(row.updated_at)
          applyCloud(row.data)
        } else {
          // No board yet — seed it from this device's current data.
          const data = buildSharedData(plays, settings, matrices)
          lastSyncedJson.current = JSON.stringify(data)
          lastUpdatedAt.current = await cloudSave(settings, data)
          setBoardUpdatedAt(lastUpdatedAt.current)
        }
        if (!cancelled) {
          ready.current = true
          setSyncStatus('synced')
        }
      } catch {
        if (!cancelled) setSyncStatus('error')
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.supabaseUrl, settings.supabaseKey, settings.boardCode])

  // Poll for changes made by other board members.
  useEffect(() => {
    if (!cloudConfigured(settings)) return undefined
    const id = setInterval(async () => {
      try {
        const row = await cloudLoad(settings)
        if (!row) return
        const json = JSON.stringify(row.data)
        if (row.updated_at !== lastUpdatedAt.current && json !== lastSyncedJson.current) {
          lastUpdatedAt.current = row.updated_at
          setBoardUpdatedAt(row.updated_at)
          applyCloud(row.data)
          toast('A teammate updated the board', 'info')
        }
        setSyncStatus('synced')
      } catch {
        setSyncStatus('error')
      }
    }, 7000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.supabaseUrl, settings.supabaseKey, settings.boardCode])

  // Push local changes to the cloud (debounced). Skips echoes and the period
  // before the initial connect has completed.
  useEffect(() => {
    if (!cloudConfigured(settings) || !ready.current) return undefined
    const data = buildSharedData(plays, settings, matrices)
    const json = JSON.stringify(data)
    if (json === lastSyncedJson.current) return undefined
    const t = setTimeout(async () => {
      try {
        lastSyncedJson.current = json
        lastUpdatedAt.current = await cloudSave(settings, data)
        setBoardUpdatedAt(lastUpdatedAt.current)
        setSyncStatus('synced')
      } catch {
        setSyncStatus('error')
      }
    }, 1500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    plays,
    matrices,
    settings.theaterName,
    settings.seasonYear,
    settings.maxScore,
    settings.venueType,
    settings.venueLocation,
    settings.audienceNotes,
    settings.scoreBlend,
  ])

  // Presence heartbeat — let teammates know this member is online.
  useEffect(() => {
    if (!cloudConfigured(settings)) return undefined
    const beat = () =>
      cloudHeartbeat(settings, memberId, settings.memberName).catch(() => {})
    beat()
    const id = setInterval(beat, 25000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.supabaseUrl, settings.supabaseKey, settings.boardCode, settings.memberName])

  // Read who's online (members seen in the last ~70s).
  useEffect(() => {
    if (!cloudConfigured(settings)) {
      setOnline([])
      return undefined
    }
    const load = async () => {
      try {
        const rows = await cloudPresence(settings)
        const now = Date.now()
        setOnline(rows.filter((r) => now - (r.lastSeen || 0) < 70000))
      } catch {
        /* ignore presence errors */
      }
    }
    load()
    const id = setInterval(load, 15000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.supabaseUrl, settings.supabaseKey, settings.boardCode])

  // Manual sync: push any pending local change, then pull the latest.
  async function syncNow() {
    if (!cloudConfigured(settings)) return
    setSyncStatus('connecting')
    try {
      const data = buildSharedData(plays, settings, matrices)
      const json = JSON.stringify(data)
      if (json !== lastSyncedJson.current) {
        lastSyncedJson.current = json
        lastUpdatedAt.current = await cloudSave(settings, data)
        setBoardUpdatedAt(lastUpdatedAt.current)
      }
      const row = await cloudLoad(settings)
      if (
        row &&
        row.updated_at !== lastUpdatedAt.current &&
        JSON.stringify(row.data) !== lastSyncedJson.current
      ) {
        lastUpdatedAt.current = row.updated_at
        setBoardUpdatedAt(row.updated_at)
        applyCloud(row.data)
        toast('Pulled the latest from your team', 'info')
      }
      setSyncStatus('synced')
    } catch {
      setSyncStatus('error')
      toast('Sync failed — check your connection', 'error')
    }
  }

  // ---- Play operations ----
  function upsertPlay(play) {
    setPlays((prev) => {
      const exists = prev.some((p) => p.id === play.id)
      if (exists) {
        toast('Play updated', 'success')
        return prev.map((p) => (p.id === play.id ? play : p))
      }
      toast('Play saved', 'success')
      return [...prev, play]
    })
  }

  function deletePlay(id) {
    setPlays((prev) => prev.filter((p) => p.id !== id))
    toast('Play deleted', 'info')
  }

  function importPlays(rows) {
    setPlays((prev) => [...prev, ...rows])
    toast(`Imported ${rows.length} play${rows.length === 1 ? '' : 's'}`, 'success')
  }

  function saveResearch(playId, research) {
    setPlays((prev) =>
      prev.map((p) =>
        p.id === playId
          ? {
              ...p,
              research,
              researchedAt: Date.now(),
              // Fill the synopsis from research only if the user hasn't written one.
              synopsis: p.synopsis?.trim() ? p.synopsis : research.synopsis || '',
            }
          : p,
      ),
    )
  }

  // ---- Settings operations ----
  function handleSaveSettings(next) {
    setSettings(next)
  }

  function resetAll() {
    clearAll()
    setPlays([])
    setSettings({ ...DEFAULT_SETTINGS })
    setMatrices([emptyMatrix('Option A')])
    setTab('dashboard')
  }

  return (
    <div className="min-h-screen bg-slate-100/40">
      <Nav active={tab} onChange={setTab} />
      {cloudConfigured(settings) && (
        <SyncBar
          status={syncStatus}
          online={online}
          boardUpdatedAt={boardUpdatedAt}
          onSyncNow={syncNow}
          memberId={memberId}
        />
      )}
      <main className="mx-auto max-w-6xl px-4 py-8">
        {tab === 'dashboard' && <Dashboard plays={plays} settings={settings} />}
        {tab === 'plays' && (
          <PlaysManager
            plays={plays}
            settings={settings}
            onSave={upsertPlay}
            onDelete={deletePlay}
            onImport={importPlays}
          />
        )}
        {tab === 'research' && (
          <Research plays={plays} settings={settings} onResearched={saveResearch} />
        )}
        {tab === 'compare' && <Compare plays={plays} settings={settings} />}
        {tab === 'matrix' && (
          <SeasonMatrix
            plays={plays}
            matrices={matrices}
            setMatrices={setMatrices}
            settings={settings}
          />
        )}
        {tab === 'settings' && (
          <Settings
            settings={settings}
            onSave={handleSaveSettings}
            onResetAll={resetAll}
            syncStatus={syncStatus}
          />
        )}
        {tab === 'export' && <Export plays={plays} settings={settings} matrices={matrices} />}
      </main>
      <footer className="mx-auto max-w-6xl px-4 pb-8 pt-2 text-center text-xs text-slate-400">
        Play Scoring Guide · {SYNC_LABEL[syncStatus]} · Build {APP_VERSION}
      </footer>
    </div>
  )
}
