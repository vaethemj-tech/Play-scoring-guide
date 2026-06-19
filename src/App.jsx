import { useEffect, useRef, useState } from 'react'
import Nav from './components/Nav.jsx'
import Dashboard from './components/Dashboard.jsx'
import PlaysManager from './components/PlaysManager.jsx'
import Research from './components/Research.jsx'
import Compare from './components/Compare.jsx'
import Settings from './components/Settings.jsx'
import Export from './components/Export.jsx'
import { useToast } from './components/Toast.jsx'
import {
  loadPlays,
  savePlays,
  loadSettings,
  saveSettings,
  clearAll,
} from './lib/storage.js'
import { cloudConfigured, cloudLoad, cloudSave, buildSharedData } from './lib/cloud.js'
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
  const [syncStatus, setSyncStatus] = useState('off')

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

  // Applies a shared board payload from the cloud into local state. Records the
  // payload hash so the save effect treats the resulting state change as an echo.
  function applyCloud(data) {
    if (!data) return
    lastSyncedJson.current = JSON.stringify(data)
    if (Array.isArray(data.plays)) setPlays(data.plays)
    if (data.shared && typeof data.shared === 'object') {
      setSettings((prev) => ({ ...prev, ...data.shared }))
    }
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
          applyCloud(row.data)
        } else {
          // No board yet — seed it from this device's current data.
          const data = buildSharedData(plays, settings)
          lastSyncedJson.current = JSON.stringify(data)
          lastUpdatedAt.current = await cloudSave(settings, data)
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
          applyCloud(row.data)
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
    const data = buildSharedData(plays, settings)
    const json = JSON.stringify(data)
    if (json === lastSyncedJson.current) return undefined
    const t = setTimeout(async () => {
      try {
        lastSyncedJson.current = json
        lastUpdatedAt.current = await cloudSave(settings, data)
        setSyncStatus('synced')
      } catch {
        setSyncStatus('error')
      }
    }, 1500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    plays,
    settings.theaterName,
    settings.seasonYear,
    settings.maxScore,
    settings.venueType,
    settings.venueLocation,
    settings.audienceNotes,
    settings.scoreBlend,
  ])

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
      prev.map((p) => (p.id === playId ? { ...p, research, researchedAt: Date.now() } : p)),
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
    setTab('dashboard')
  }

  return (
    <div className="min-h-screen bg-slate-100/40">
      <Nav active={tab} onChange={setTab} />
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
        {tab === 'settings' && (
          <Settings
            settings={settings}
            onSave={handleSaveSettings}
            onResetAll={resetAll}
            syncStatus={syncStatus}
          />
        )}
        {tab === 'export' && <Export plays={plays} settings={settings} />}
      </main>
      <footer className="mx-auto max-w-6xl px-4 pb-8 pt-2 text-center text-xs text-slate-400">
        Play Scoring Guide · {SYNC_LABEL[syncStatus]} · Build {APP_VERSION}
      </footer>
    </div>
  )
}
