import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { getScore, maxScore } from './scoring.js'

const PRIMARY = [27, 79, 138] // #1B4F8A
const ACCENT = [46, 117, 182] // #2E75B6
const GRAY = [100, 116, 139]

function formatCast(play) {
  if (play.castMin && play.castMax) return `${play.castMin}–${play.castMax}`
  if (play.castMin) return `${play.castMin}+`
  if (play.castMax) return `up to ${play.castMax}`
  return '—'
}

// Generates a board-ready PDF report and triggers a download.
// options: { topN: number|null }
export function generateReport(rankedPlays, settings, options = {}) {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const max = maxScore(settings)

  const plays =
    options.topN && options.topN > 0 ? rankedPlays.slice(0, options.topN) : rankedPlays

  // ---- Cover page ----
  doc.setFillColor(...PRIMARY)
  doc.rect(0, 0, pageW, 220, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(30)
  doc.text('Season Play Evaluation', 48, 110)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'normal')
  doc.text('Board Report', 48, 140)

  doc.setTextColor(30, 41, 59)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text(settings.theaterName || 'Theater Board', 48, 290)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(12)
  doc.setTextColor(...GRAY)
  const dateStr = new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  doc.text(`Season: ${settings.seasonYear || '—'}`, 48, 314)
  doc.text(`Generated: ${dateStr}`, 48, 332)
  doc.text(`Plays included: ${plays.length}`, 48, 350)

  // ---- Ranked summary table ----
  doc.addPage()
  sectionHeading(doc, 'Ranked Plays', 56)

  autoTable(doc, {
    startY: 76,
    head: [['#', 'Title', 'Playwright', 'Genre', 'Score', 'Rights cost']],
    body: plays.map((p, i) => [
      String(i + 1),
      p.title || '(untitled)',
      p.playwright || '—',
      p.genre || '—',
      `${getScore(p)} / ${max}`,
      p.research ? p.research.rightsCost || 'Not listed' : '—',
    ]),
    styles: { fontSize: 10, cellPadding: 6 },
    headStyles: { fillColor: PRIMARY, textColor: 255 },
    alternateRowStyles: { fillColor: [241, 245, 249] },
    margin: { left: 48, right: 48 },
  })

  // ---- Per-play detail ----
  plays.forEach((p, i) => {
    doc.addPage()
    sectionHeading(doc, `${i + 1}. ${p.title || '(untitled)'}`, 56)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    doc.setTextColor(...GRAY)
    const meta = [
      p.playwright ? `By ${p.playwright}` : null,
      p.genre || null,
      p.yearWritten ? `Written ${p.yearWritten}` : null,
      p.runtime ? `${p.runtime} min` : null,
      `Cast ${formatCast(p)}`,
    ]
      .filter(Boolean)
      .join('  •  ')
    doc.text(meta, 48, 76)

    let y = 100
    if (p.staging) {
      doc.setFontSize(10)
      const stagingLines = doc.splitTextToSize(`Staging notes: ${p.staging}`, pageW - 96)
      doc.text(stagingLines, 48, y)
      y += stagingLines.length * 13 + 6
    }

    // Score callout
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.setTextColor(...PRIMARY)
    doc.text(`Score: ${getScore(p)} / ${max}`, 48, y)
    y += 28

    // Rights & production quick facts
    if (p.research) {
      const r = p.research
      const facts = [
        `Rights cost: ${r.rightsCost || 'Not listed'}${r.rightsHolder ? ` (${r.rightsHolder})` : ''}`,
        `Rights availability: ${r.rightsAvailability || 'Unknown'}`,
        `Production complexity: ${r.complexityRating || 'Unknown'}`,
        `Audience appeal: ${r.audienceAppealRating || 'Unknown'}`,
      ]
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(...PRIMARY)
      doc.text('Rights & Production', 48, y)
      y += 15
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.setTextColor(51, 65, 85)
      facts.forEach((f) => {
        y = ensureSpace(doc, y, 14, pageH)
        doc.text(f, 48, y)
        y += 13
      })
      y += 10
    }

    // Research summary
    if (p.research) {
      const r = p.research
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.setTextColor(...PRIMARY)
      doc.text('Market Research', 48, y)
      y += 16

      const blocks = [
        ['Summary', r.summary],
        ['Licensing & Royalties', r.licensing],
        ['Recent Production History', r.productionHistory],
        ['Audience Reception', r.audienceReception],
        ['Production Complexity & Budget', r.complexity],
      ]
      doc.setFontSize(10)
      blocks.forEach(([label, body]) => {
        if (!body) return
        y = ensureSpace(doc, y, 60, pageH)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(30, 41, 59)
        doc.text(label, 48, y)
        y += 14
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(51, 65, 85)
        const lines = doc.splitTextToSize(body, pageW - 96)
        lines.forEach((line) => {
          y = ensureSpace(doc, y, 14, pageH)
          doc.text(line, 48, y)
          y += 13
        })
        y += 8
      })

      if (p.researchedAt) {
        doc.setFontSize(8)
        doc.setTextColor(...GRAY)
        doc.text(`Research last run: ${new Date(p.researchedAt).toLocaleString()}`, 48, y)
      }
    } else {
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(10)
      doc.setTextColor(...GRAY)
      doc.text('No market research has been run for this play.', 48, y)
    }
  })

  // ---- Footers ----
  const pages = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(...GRAY)
    doc.text(settings.theaterName || 'Play Scoring Guide', 48, pageH - 24)
    doc.text(`Page ${i} of ${pages}`, pageW - 48, pageH - 24, { align: 'right' })
  }

  const safeName = (settings.theaterName || 'theater').replace(/[^a-z0-9]+/gi, '-').toLowerCase()
  doc.save(`${safeName}-play-report-${settings.seasonYear || ''}.pdf`)
}

function sectionHeading(doc, text, y) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(...PRIMARY)
  doc.text(text, 48, y)
  doc.setDrawColor(...ACCENT)
  doc.setLineWidth(1.5)
  doc.line(48, y + 8, doc.internal.pageSize.getWidth() - 48, y + 8)
}

function ensureSpace(doc, y, needed, pageH) {
  if (y + needed > pageH - 48) {
    doc.addPage()
    return 56
  }
  return y
}
