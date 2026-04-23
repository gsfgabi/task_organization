export function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const escape = (c: string | number) => {
    const s = String(c)
    return `"${s.replaceAll('"', '""')}"`
  }
  const line = (r: (string | number)[]) => r.map(escape).join(';')
  const body = [line(headers), ...rows.map(line)].join('\r\n')
  const blob = new Blob(['\uFEFF' + body], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}
