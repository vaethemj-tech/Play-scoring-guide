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
