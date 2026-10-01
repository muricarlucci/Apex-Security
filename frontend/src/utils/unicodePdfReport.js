// Browser text rendering preserves CJK glyphs and Devanagari shaping that the
// built-in jsPDF Latin fonts cannot represent. Loaded only for zh/hi/ja exports.
export async function generateUnicodeReport(doc, title, metadata, headers, rows, filename) {
  const { default: html2canvas } = await import('html2canvas')
  const sheet = document.createElement('section')
  sheet.style.cssText = 'position:absolute;left:-10000px;top:0;width:1120px;padding:48px;box-sizing:border-box;background:white;color:#222;font:22px sans-serif;'
  document.body.appendChild(sheet)
  const maxHeight = 1120 * 277 / 180
  let table, body, page = 0
  const addText = (text, tag = 'p') => {
    const element = document.createElement(tag)
    element.textContent = text
    sheet.appendChild(element)
  }
  const startPage = () => {
    sheet.replaceChildren()
    addText(title, 'h1')
    metadata.forEach(text => addText(text))
    table = document.createElement('table')
    table.style.cssText = 'width:100%;table-layout:fixed;border-collapse:collapse;font:20px sans-serif;'
    const head = table.createTHead().insertRow()
    headers.forEach(text => {
      const cell = document.createElement('th')
      cell.textContent = text
      cell.style.cssText = 'padding:12px;text-align:left;background:#1e1a0a;color:white;border:1px solid #aaa;overflow-wrap:anywhere;'
      head.appendChild(cell)
    })
    body = table.createTBody()
    sheet.appendChild(table)
  }
  const renderPage = async () => {
    const canvas = await html2canvas(sheet, {
      scale: 2, backgroundColor: '#fff',
      onclone: document => {
        const clone = document.querySelector('[data-apex-pdf]')
        if (clone) clone.style.left = '0'
      },
    })
    if (page++) doc.addPage()
    const height = Math.min(277, canvas.height / canvas.width * 180)
    doc.addImage(canvas.toDataURL('image/png'), 'PNG', 14, 10, 180, height)
  }
  sheet.dataset.apexPdf = 'true'
  try {
    startPage()
    for (const values of rows) {
      const row = document.createElement('tr')
      values.forEach(value => {
        const cell = row.insertCell()
        cell.textContent = String(value ?? '')
        cell.style.cssText = 'padding:12px;border:1px solid #bbb;vertical-align:top;overflow-wrap:anywhere;'
      })
      body.appendChild(row)
      if (sheet.offsetHeight > maxHeight && body.rows.length > 1) {
        row.remove()
        await renderPage()
        startPage()
        body.appendChild(row)
      }
    }
    await renderPage()
    doc.save(filename)
  } finally {
    sheet.remove()
  }
}
