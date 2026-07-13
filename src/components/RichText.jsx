// Renders simple Markdown-ish AI text (bold, bullet/numbered lists, headings,
// paragraphs) as clean, readable elements — so raw **, -, and # don't show.

function renderInline(text) {
  // Split on **bold** and render the bold segments.
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) {
      return (
        <strong key={i} className="font-semibold text-slate-800">
          {part.slice(2, -2)}
        </strong>
      )
    }
    // Strip stray emphasis markers that aren't part of a pair.
    return <span key={i}>{part.replace(/\*\*/g, '')}</span>
  })
}

export default function RichText({ text, className = '' }) {
  if (!text) return null

  const blocks = []
  let list = null // { ordered: bool, items: [] }
  const flush = () => {
    if (list) {
      blocks.push({ type: 'list', ordered: list.ordered, items: list.items })
      list = null
    }
  }

  text.split('\n').forEach((raw) => {
    const line = raw.trim()
    if (!line) {
      flush()
      return
    }
    const heading = line.match(/^#{1,6}\s+(.*)$/)
    if (heading) {
      flush()
      blocks.push({ type: 'h', text: heading[1].replace(/[*#]/g, '').trim() })
      return
    }
    const bullet = line.match(/^[-*•]\s+(.*)$/)
    const numbered = line.match(/^\d+[.)]\s+(.*)$/)
    if (bullet || numbered) {
      const ordered = Boolean(numbered)
      const item = (bullet || numbered)[1]
      if (!list || list.ordered !== ordered) {
        flush()
        list = { ordered, items: [] }
      }
      list.items.push(item)
      return
    }
    flush()
    // A short line ending in ":" reads as a subheading.
    if (line.length <= 60 && /:$/.test(line) && !/[.!?]$/.test(line.slice(0, -1))) {
      blocks.push({ type: 'h', text: line.replace(/[*#:]/g, '').trim() })
      return
    }
    blocks.push({ type: 'p', text: line })
  })
  flush()

  return (
    <div className={`space-y-2 ${className}`}>
      {blocks.map((b, i) => {
        if (b.type === 'h') {
          return (
            <h4 key={i} className="pt-1 text-sm font-semibold text-primary">
              {b.text}
            </h4>
          )
        }
        if (b.type === 'list') {
          const Tag = b.ordered ? 'ol' : 'ul'
          return (
            <Tag key={i} className={`space-y-1 pl-5 ${b.ordered ? 'list-decimal' : 'list-disc'}`}>
              {b.items.map((it, j) => (
                <li key={j} className="pl-1">
                  {renderInline(it)}
                </li>
              ))}
            </Tag>
          )
        }
        return (
          <p key={i} className="leading-relaxed">
            {renderInline(b.text)}
          </p>
        )
      })}
    </div>
  )
}
