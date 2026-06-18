import { useEffect, useState } from 'react'
import Nav from './components/Nav.jsx'
import Dashboard from './components/Dashboard.jsx'
import PlaysManager from './components/PlaysManager.jsx'
import Research from './components/Research.jsx'
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
import { DEFAULT_SETTINGS, APP_VERSION } from './constants.js'

export default function App() {
  const toast = useToast()
  const [tab, setTab] = useState('dashboard')
  const [plays, setPlays] = useState(() => loadPlays())
  const [settings, setSettings] = useState(() => loadSettings())

  // Persist to localStorage so data survives a page refresh.
  useEffect(() => {
    savePlays(plays)
  }, [plays])

  useEffect(() => {
    saveSettings(settings)
  }, [settings])

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
        p.id === playId ? { ...p, research, researchedAt: Date.now() } : p,
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
        {tab === 'settings' && (
          <Settings settings={settings} onSave={handleSaveSettings} onResetAll={resetAll} />
        )}
        {tab === 'export' && <Export plays={plays} settings={settings} />}
      </main>
      <footer className="mx-auto max-w-6xl px-4 pb-8 pt-2 text-center text-xs text-slate-400">
        Play Scoring Guide · Data is stored locally in your browser · Build {APP_VERSION}
      </footer>
    </div>
  )
}
