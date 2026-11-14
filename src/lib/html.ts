// Helpers for converting between the POC's legacy HTML and TipTap-compatible HTML.

const PLACEHOLDER_SVG = (label: string) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="300" viewBox="0 0 800 300"><rect width="800" height="300" rx="16" fill="#efecf3"/><g fill="none" stroke="#8b8595" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" transform="translate(372 102)"><rect x="0" y="0" width="56" height="56" rx="9"/><circle cx="18" cy="18" r="5"/><path d="m56 42-13-13L16 56"/></g><text x="400" y="200" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="18" fill="#8b8595">${label.replace(/[<>&"]/g, '')}</text></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

/** Converts POC-era markup (.todo divs, .img-ph figures) into markup TipTap understands. */
export function migrateLegacyHtml(html: string): string {
  if (!html.includes('class="todo') && !html.includes('img-ph')) return html
  const root = document.createElement('div')
  root.innerHTML = html
  root.querySelectorAll('figure.img-ph').forEach((fig) => {
    const label = fig.querySelector('figcaption')?.textContent?.trim() || 'Image'
    const img = document.createElement('img')
    img.src = PLACEHOLDER_SVG(label)
    img.alt = label
    fig.replaceWith(img)
  })
  const handled = new Set<Element>()
  for (const t of [...root.querySelectorAll(':scope > .todo')]) {
    if (handled.has(t)) continue
    const group: Element[] = []
    for (let cur: Element | null = t; cur?.classList.contains('todo'); cur = cur.nextElementSibling) group.push(cur)
    const ul = document.createElement('ul')
    ul.setAttribute('data-type', 'taskList')
    for (const el of group) {
      handled.add(el)
      const checked = el.classList.contains('done') || !!el.querySelector('input[checked]')
      const li = document.createElement('li')
      li.setAttribute('data-type', 'taskItem')
      li.setAttribute('data-checked', String(checked))
      li.innerHTML = '<label><input type="checkbox"><span></span></label><div><p></p></div>'
      li.querySelector('p')!.textContent = (el.querySelector('span') ?? el).textContent ?? ''
      ul.appendChild(li)
    }
    t.before(ul)
    group.forEach((el) => el.remove())
  }
  return root.innerHTML
}

export const plainText = (html: string) => {
  const d = document.createElement('div')
  d.innerHTML = html
  return (d.textContent ?? '').replace(/\s+/g, ' ').trim()
}
