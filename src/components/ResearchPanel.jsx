import { ratingTone, RATING_CLASSES } from '../lib/scoring.js'

function Chip({ value, kind }) {
  const tone = ratingTone(value, kind)
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${RATING_CLASSES[tone]}`}>
      {value && value !== 'Unknown' ? value : 'Unknown'}
    </span>
  )
}

// Renders a play's saved market-research results.
const SECTIONS = [
  ['summary', 'Summary'],
  ['licensing', 'Licensing & Royalties'],
  ['productionHistory', 'Recent Production History'],
  ['audienceReception', 'Audience Reception'],
  ['complexity', 'Production Complexity & Budget'],
]

export default function ResearchPanel({ research, researchedAt }) {
  if (!research) {
    return (
      <p className="text-sm italic text-slate-500">
        No research yet. Run research from the Research tab to populate this section.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {/* Key facts */}
      <div className="rounded-lg border border-slate-200 bg-white p-3">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Rights cost
          </span>
          <span className="text-right text-sm font-semibold text-slate-800">
            {research.rightsCost || 'Not listed'}
            {research.rightsHolder && (
              <span className="ml-1 font-normal text-slate-400">({research.rightsHolder})</span>
            )}
          </span>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            Rights: <Chip value={research.rightsAvailability} kind="availability" />
          </span>
          <span className="flex items-center gap-1">
            Complexity: <Chip value={research.complexityRating} kind="complexity" />
          </span>
          <span className="flex items-center gap-1">
            Appeal: <Chip value={research.audienceAppealRating} kind="appeal" />
          </span>
        </div>
      </div>

      {SECTIONS.map(([key, label]) =>
        research[key] ? (
          <div key={key}>
            <h4 className="text-sm font-semibold text-primary">{label}</h4>
            <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-700">
              {research[key]}
            </p>
          </div>
        ) : null,
      )}

      {Array.isArray(research.sources) && research.sources.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-primary">Sources</h4>
          <ul className="mt-1 list-inside list-disc space-y-1 text-sm">
            {research.sources.map((s, i) => (
              <li key={i}>
                {s.url ? (
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent underline hover:text-primary"
                  >
                    {s.title || s.url}
                  </a>
                ) : (
                  <span className="text-slate-600">{s.title}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {researchedAt && (
        <p className="pt-1 text-xs text-slate-400">
          Last run: {new Date(researchedAt).toLocaleString()}
        </p>
      )}
    </div>
  )
}
