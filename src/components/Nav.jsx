import { TABS } from '../constants.js'
import { Theater } from './Icons.jsx'

export default function Nav({ active, onChange }) {
  return (
    <header className="border-b border-slate-200 bg-primary">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex items-center gap-3 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 text-white">
            <Theater />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight text-white">Play Scoring Guide</h1>
            <p className="text-xs text-white/70">Organize, rank, and research your season</p>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                active === tab.id
                  ? 'border-white text-white'
                  : 'border-transparent text-white/70 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  )
}
