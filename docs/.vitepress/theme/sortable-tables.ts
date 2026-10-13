
function toNumber(text: string): number | null {
  const t = text.replace(/,/g, '').trim()
  if (!t || !/^-?\d+(\.\d+)?$/.test(t)) return null
  return Number(t)
}

const RANK_ORDER = ['E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS']

function toRank(text: string): number | null {
  const i = RANK_ORDER.indexOf(text.trim())
  return i < 0 ? null : i + 1
}

type ColumnKind = 'number' | 'rank' | 'text'

function columnKind(rows: HTMLTableRowElement[], index: number): ColumnKind {
  let numbers = 0
  let ranks = 0
  for (const row of rows) {
    const text = row.cells[index]?.textContent?.trim()
    if (!text || text === '—') continue
    if (toNumber(text) !== null) numbers++
    else if (toRank(text) !== null) ranks++
    else return 'text'
    if (numbers + ranks >= 20) break
  }
  if (numbers && ranks) return 'text'
  return numbers ? 'number' : ranks ? 'rank' : 'text'
}

const SORTABLE_FIRST_HEADER = 'No.'

const IMAGE_HEADER = '画像'

const headerText = (th: HTMLTableCellElement | undefined): string => th?.textContent?.trim() ?? ''
const isSortableHeader = (th: HTMLTableCellElement): boolean => headerText(th) !== IMAGE_HEADER

const NOWRAP_MAX_LENGTH = 20

const STICKY_MAX_RATIO = 0.7

const collator = new Intl.Collator('ja', { numeric: true })

const originalIndex = new WeakMap<HTMLTableRowElement, number>()

function sortRows(
  tbody: HTMLTableSectionElement,
  headers: HTMLTableCellElement[],
  index: number,
  direction: 'asc' | 'desc',
  kind: ColumnKind
): void {
  const sign = direction === 'asc' ? 1 : -1
  const rows = [...tbody.rows]
  const valueOf = kind === 'rank' ? toRank : toNumber

  rows.sort((a, b) => {
    const ta = a.cells[index]?.textContent?.trim() ?? ''
    const tb = b.cells[index]?.textContent?.trim() ?? ''

    if (kind !== 'text') {
      const na = valueOf(ta)
      const nb = valueOf(tb)
      if (na === null && nb !== null) return 1
      if (nb === null && na !== null) return -1
      if (na !== null && nb !== null && na !== nb) return (na - nb) * sign
    } else if (ta !== tb) {
      return collator.compare(ta, tb) * sign
    }
    return (originalIndex.get(a) ?? 0) - (originalIndex.get(b) ?? 0)
  })

  const fragment = document.createDocumentFragment()
  for (const row of rows) fragment.appendChild(row)
  tbody.appendChild(fragment)

  headers.forEach((th, i) => {
    if (!isSortableHeader(th)) return
    th.setAttribute('aria-sort', i !== index ? 'none' : direction === 'asc' ? 'ascending' : 'descending')
  })
}

function nameColumnOf(headers: HTMLTableCellElement[]): number {
  const i = headers.findIndex((th) => headerText(th) !== SORTABLE_FIRST_HEADER && headerText(th) !== IMAGE_HEADER)
  return i < 0 ? 0 : i
}

function stickyColumnsOf(headers: HTMLTableCellElement[]): number[] {
  const nameCol = nameColumnOf(headers)
  return nameCol > 0 && headerText(headers[nameCol - 1]) === IMAGE_HEADER ? [nameCol - 1, nameCol] : [nameCol]
}

function markNoWrapColumns(table: HTMLTableElement): void {
  const rows = [...(table.tBodies[0]?.rows ?? [])]
  const headers = [...(table.tHead?.rows[0]?.cells ?? [])]
  if (!rows.length || !headers.length) return
  const nameCol = nameColumnOf(headers)

  headers.forEach((th, i) => {
    if (i !== nameCol) {
      let longest = th.textContent?.trim().length ?? 0
      for (const row of rows) {
        const text = row.cells[i]?.textContent?.trim() ?? ''
        if (text.length > longest) longest = text.length
        if (longest > NOWRAP_MAX_LENGTH) return
      }
    }
    th.classList.add('nowrap')
    for (const row of rows) row.cells[i]?.classList.add('nowrap')
  })
}

function markStickyColumns(table: HTMLTableElement): void {
  const rows = [...(table.tBodies[0]?.rows ?? [])]
  const headers = [...(table.tHead?.rows[0]?.cells ?? [])]
  if (!rows.length || !headers.length) return
  let cols = stickyColumnsOf(headers)
  const cellsOf = (i: number) => [headers[i], ...rows.map((r) => r.cells[i])].filter(Boolean) as HTMLTableCellElement[]
  const widthOf = (i: number) => headers[i].getBoundingClientRect().width

  for (const i of cols) for (const c of cellsOf(i)) { c.classList.remove('sticky-col'); c.style.left = '' }
  if (table.scrollWidth <= table.clientWidth + 1) return
  const limit = table.clientWidth * STICKY_MAX_RATIO
  while (cols.length && cols.reduce((sum, i) => sum + widthOf(i), 0) > limit) cols = cols.slice(1)
  let left = 0
  for (const i of cols) {
    for (const c of cellsOf(i)) {
      c.classList.add('sticky-col')
      if (left) c.style.left = `${left}px`
    }
    left += widthOf(i)
  }
}

export function refreshStickyColumns(): void {
  for (const t of document.querySelectorAll<HTMLTableElement>('.Layout.wide-page .vp-doc table[data-table-ready]')) {
    markStickyColumns(t)
  }
}

let stickyResizeBound = false
function bindStickyResize(): void {
  if (stickyResizeBound) return
  stickyResizeBound = true
  let timer: ReturnType<typeof setTimeout> | undefined
  window.addEventListener('resize', () => {
    clearTimeout(timer)
    timer = setTimeout(refreshStickyColumns, 200)
  })
  document.fonts?.ready.then(refreshStickyColumns)
}

export function setupSortableTables(): void {
  const tables = document.querySelectorAll<HTMLTableElement>('.Layout.wide-page .vp-doc table')

  for (const table of tables) {
    if (table.dataset.tableReady === 'yes') continue
    table.dataset.tableReady = 'yes'

    const tbody = table.tBodies[0]
    const headers = [...(table.tHead?.rows[0]?.cells ?? [])] as HTMLTableCellElement[]
    if (!tbody || !headers.length) continue

    markNoWrapColumns(table)
    markStickyColumns(table)
    bindStickyResize()

    if (tbody.rows.length < 2) continue
    const optedIn = document.querySelector('.Layout.sortable-list') !== null
    if (!optedIn && headers[0].textContent?.trim() !== SORTABLE_FIRST_HEADER) continue
    table.dataset.sortable = 'ready'

    const rows = [...tbody.rows]
    rows.forEach((row, i) => originalIndex.set(row, i))
    const kinds = headers.map((_, i) => columnKind(rows, i))

    headers.forEach((th, i) => {
      if (!isSortableHeader(th)) {
        th.classList.add('no-sort')
        return
      }
      const label = th.textContent?.trim() ?? ''
      th.tabIndex = 0
      th.setAttribute('role', 'button')
      th.setAttribute('aria-sort', 'none')
      th.setAttribute('title', `${label}で並べ替え`)

      const toggle = () => {
        const current = th.getAttribute('aria-sort')
        const firstPress: 'asc' | 'desc' = kinds[i] === 'rank' || (i > 0 && kinds[i] === 'number') ? 'desc' : 'asc'
        const direction: 'asc' | 'desc' =
          current === 'ascending' ? 'desc'
          : current === 'descending' ? 'asc'
          : firstPress
        sortRows(tbody, headers, i, direction, kinds[i])
      }

      th.addEventListener('click', toggle)
      th.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return
        event.preventDefault()
        toggle()
      })
    })
  }
}
