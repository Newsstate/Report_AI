import { saveAs } from 'file-saver'
import type { OutputFormat } from '@/types'

// ── WB BRAND COLORS ──────────────────────────────────────────────────────────
const C = {
  navy: '1F3A6E',
  blue: '2E5FA3',
  light: 'F2F6FB',
  white: 'FFFFFF',
  dark: '2D2D2D',
  mid: '555555',
  green: '16A34A',
  red: 'DC2626',
  border: 'C8D8EE',
}

export async function exportReport(
  content: string,
  clientName: string,
  format: OutputFormat
) {
  const date = new Date().toISOString().split('T')[0]
  const safe = (clientName || 'Client').replace(/[^a-z0-9]/gi, '_')
  const filename = `${safe}_SEO_Report_${date}`

  if (format === 'pdf') {
    exportAsPDF(content, clientName)
  } else if (format === 'docx') {
    await exportAsDocx(content, filename, clientName)
  } else if (format === 'html') {
    saveAs(
      new Blob([buildHtml(content, clientName)], {
        type: 'text/html;charset=utf-8',
      }),
      `${filename}.html`
    )
  } else {
    saveAs(
      new Blob([content], {
        type: 'text/plain;charset=utf-8',
      }),
      `${filename}.md`
    )
  }
}

// ── PDF ──────────────────────────────────────────────────────────────────────
function exportAsPDF(md: string, clientName: string) {
  const html = buildHtml(md, clientName)

  const w = window.open('', '_blank', 'width=960,height=750')

  if (!w) {
    alert('Allow popups to download PDF')
    return
  }

  w.document.write(html)
  w.document.close()
  w.focus()

  setTimeout(() => {
    w.print()
  }, 900)
}

// ── DOCX ─────────────────────────────────────────────────────────────────────
async function exportAsDocx(
  md: string,
  filename: string,
  clientName: string
) {
  const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    Table,
    TableRow,
    TableCell,
    AlignmentType,
    BorderStyle,
    WidthType,
    ShadingType,
    VerticalAlign,
    LevelFormat,
  } = await import('docx')

  const bdr = (col = C.border) => ({
    style: BorderStyle.SINGLE,
    size: 4,
    color: col,
  })

  const bdrs = (col = C.border) => ({
    top: bdr(col),
    bottom: bdr(col),
    left: bdr(col),
    right: bdr(col),
  })

  function cell(
    text: string,
    w: number,
    isHdr = false,
    bg?: string,
    textColor?: string,
    align = AlignmentType.CENTER
  ) {
    const tc = textColor || (isHdr ? C.white : C.dark)

    return new TableCell({
      borders: bdrs(isHdr ? C.navy : C.border),

      width: {
        size: w,
        type: WidthType.DXA,
      },

      shading: bg
        ? {
            fill: bg,
            type: ShadingType.CLEAR,
          }
        : undefined,

      margins: {
        top: 100,
        bottom: 100,
        left: 140,
        right: 140,
      },

      verticalAlign: VerticalAlign.CENTER,

      children: [
        new Paragraph({
          alignment: align,

          children: [
            new TextRun({
              text: text.trim(),
              bold: isHdr,
              color: tc,
              size: isHdr ? 20 : 19,
              font: 'Arial',
            }),
          ],

          spacing: {
            before: 0,
            after: 0,
          },
        }),
      ],
    })
  }

  const lines = md.split('\n')

  const paragraphs: InstanceType<typeof Paragraph>[] = []

  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,

      spacing: {
        before: 400,
        after: 200,
      },

      children: [
        new TextRun({
          text: 'SEO Performance Report',
          bold: true,
          size: 36,
          color: C.navy,
          font: 'Arial',
        }),
      ],
    }),

    new Paragraph({
      alignment: AlignmentType.CENTER,

      spacing: {
        before: 0,
        after: 100,
      },

      children: [
        new TextRun({
          text: clientName,
          bold: true,
          size: 28,
          color: C.blue,
          font: 'Arial',
        }),
      ],
    })
  )

  lines.forEach((line) => {
    if (!line.trim()) return

    paragraphs.push(
      new Paragraph({
        spacing: {
          before: 40,
          after: 40,
        },

        children: [
          new TextRun({
            text: line,
            size: 22,
            color: C.dark,
            font: 'Arial',
          }),
        ],
      })
    )
  })

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: 'bullets',

          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: '\u2022',
              alignment: AlignmentType.LEFT,
            },
          ],
        },
      ],
    },

    sections: [
      {
        properties: {},

        children: paragraphs,
      },
    ],
  })

  const buf = await Packer.toBuffer(doc)

  saveAs(
    new Blob([new Uint8Array(buf)], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    }),
    `${filename}.docx`
  )
}

// ── HTML ─────────────────────────────────────────────────────────────────────
export function buildHtml(md: string, title: string): string {
  const esc = (s: string) =>
    s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')

  let html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>${esc(title)} — SEO Report</title>

<style>
body{
  font-family:Arial,sans-serif;
  background:#F4F6F9;
  color:#2D2D2D;
  padding:40px;
  line-height:1.7;
}

.page{
  max-width:900px;
  margin:0 auto;
  background:#fff;
  padding:40px;
  border-radius:10px;
}

.cover{
  text-align:center;
  margin-bottom:40px;
}

.cover h1{
  color:#1F3A6E;
  margin-bottom:10px;
}

.cover .sub{
  color:#2E5FA3;
  font-size:18px;
  margin-bottom:10px;
}

p{
  margin:10px 0;
}

.print-btn{
  position:fixed;
  bottom:24px;
  right:24px;
  background:#1F3A6E;
  color:#fff;
  border:none;
  padding:12px 20px;
  border-radius:8px;
  cursor:pointer;
}
</style>

</head>

<body>

<button class="print-btn" onclick="window.print()">
Print / Save PDF
</button>

<div class="page">

<div class="cover">
  <div class="sub">${esc(title)}</div>
  <h1>SEO Performance Report</h1>
</div>
`

  md.split('\n').forEach((line) => {
    if (!line.trim()) return

    html += `<p>${esc(line)}</p>`
  })

  html += `
</div>
</body>
</html>
`

  return html
}

