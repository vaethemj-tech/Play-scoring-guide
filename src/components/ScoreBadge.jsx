import { TIER_CLASSES } from '../lib/scoring.js'

export default function ScoreBadge({ tier, children, title }) {
  return (
    <span
      title={title}
      className={`inline-flex min-w-[3rem] items-center justify-center rounded-full px-2.5 py-1 text-sm font-bold ${TIER_CLASSES[tier]}`}
    >
      {children}
    </span>
  )
}
