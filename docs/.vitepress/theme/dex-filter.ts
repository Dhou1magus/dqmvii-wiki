const RANKS = [1, 2, 3, 4, 5, 6, 7]
export const DEX_SPECIES = ['スライム', 'ドラゴン', '自然', '魔獣', '物質', '悪魔', 'ゾンビ', 'メタル', '特殊']
const KINDS = ['雑魚', '転生', 'ボス', 'コインボス']
const HIDE_CLASS = 'dex-hide'

export type Kinds = Record<string, string[]>

function identify(row: HTMLTableRowElement, nameCol: number): { id: string; name: string } {
  const cell = row.cells[nameCol]
  const href = cell?.querySelector('a')?.getAttribute('href') ?? ''
  const id = decodeURIComponent(href.split('#')[0].split('?')[0].replace(/\/$/, '').split('/').pop() ?? '')
  return { id, name: cell?.textContent?.trim() ?? '' }
}

function kindOf(row: HTMLTableRowElement, nameCol: number, kinds: Kinds): string {
  const { id, name } = identify(row, nameCol)
  for (const k of KINDS) {
    if (k === '雑魚') continue
    const list = kinds[k] ?? []
    if ((id && list.includes(id)) || (name && list.includes(name))) return k
  }
  return '雑魚'
}

function speciesOf(row: HTMLTableRowElement, speciesCol: number): string {
  if (speciesCol < 0) return ''
  return row.cells[speciesCol]?.textContent?.trim() ?? ''
}

function rankOf(row: HTMLTableRowElement, rankCol: number): number | null {
  const n = Number(row.cells[rankCol]?.textContent?.trim())
  return Number.isInteger(n) && n >= 1 ? n : null
}

function columnIndex(headers: HTMLTableCellElement[], text: string): number {
  return headers.findIndex((th) => th.textContent?.trim() === text)
}

function buildBar(table: HTMLTableElement, kinds: Kinds): HTMLElement | null {
  const headers = [...(table.tHead?.rows[0]?.cells ?? [])] as HTMLTableCellElement[]
  const rows = [...(table.tBodies[0]?.rows ?? [])]
  const rankCol = columnIndex(headers, 'ランク')
  const nameCol = columnIndex(headers, 'モンスター')
  const speciesCol = columnIndex(headers, '系統')
  if (rankCol < 0 || nameCol < 0 || !rows.length) return null

  const rank = new Map<HTMLTableRowElement, number | null>()
  const species = new Map<HTMLTableRowElement, string>()
  const kind = new Map<HTMLTableRowElement, string>()
  for (const r of rows) {
    rank.set(r, rankOf(r, rankCol))
    species.set(r, speciesOf(r, speciesCol))
    kind.set(r, kindOf(r, nameCol, kinds))
  }
  const shownSpecies = speciesCol < 0 ? [] : DEX_SPECIES.filter((s) => [...species.values()].includes(s))

  const selectedRanks = new Set<number>()
  const selectedSpecies = new Set<string>()
  const selectedKinds = new Set<string>()

  const bar = document.createElement('div')
  bar.className = 'dex-filter'
  bar.setAttribute('role', 'group')
  bar.setAttribute('aria-label', '図鑑の絞り込み')

  const makeButton = (label: string, group: 'rank' | 'species' | 'kind' | 'all') => {
    const b = document.createElement('button')
    b.type = 'button'
    b.textContent = label
    b.dataset.group = group
    b.setAttribute('aria-pressed', 'false')
    return b
  }

  const empty = document.createElement('p')
  empty.className = 'dex-empty'
  empty.textContent = 'この条件にあてはまるモンスターはいません。'
  empty.hidden = true

  const apply = () => {
    let shown = 0
    for (const r of rows) {
      const okRank = selectedRanks.size === 0 || (rank.get(r) !== null && selectedRanks.has(rank.get(r) as number))
      const okSpecies = selectedSpecies.size === 0 || selectedSpecies.has(species.get(r) ?? '')
      const okKind = selectedKinds.size === 0 || selectedKinds.has(kind.get(r) ?? '雑魚')
      const hide = !(okRank && okSpecies && okKind)
      r.classList.toggle(HIDE_CLASS, hide)
      if (!hide) shown++
    }
    empty.hidden = shown > 0
    for (const b of bar.querySelectorAll<HTMLButtonElement>('button')) {
      const on = b.dataset.group === 'rank' ? selectedRanks.has(Number(b.dataset.value))
        : b.dataset.group === 'species' ? selectedSpecies.has(b.dataset.value ?? '')
        : b.dataset.group === 'kind' ? selectedKinds.has(b.dataset.value ?? '')
        : selectedRanks.size === 0 && selectedSpecies.size === 0 && selectedKinds.size === 0
      b.setAttribute('aria-pressed', on ? 'true' : 'false')
    }
    table.dispatchEvent(new Event('dex-filter-change'))
  }

  const rankWrap = document.createElement('span')
  rankWrap.className = 'grp'
  for (const n of RANKS) {
    const b = makeButton(`ランク${n}`, 'rank')
    b.dataset.value = String(n)
    b.addEventListener('click', () => {
      selectedRanks.has(n) ? selectedRanks.delete(n) : selectedRanks.add(n)
      apply()
    })
    rankWrap.appendChild(b)
  }
  const speciesWrap = document.createElement('span')
  speciesWrap.className = 'grp'
  for (const s of shownSpecies) {
    const b = makeButton(s, 'species')
    b.dataset.value = s
    b.addEventListener('click', () => {
      selectedSpecies.has(s) ? selectedSpecies.delete(s) : selectedSpecies.add(s)
      apply()
    })
    speciesWrap.appendChild(b)
  }
  const kindWrap = document.createElement('span')
  kindWrap.className = 'grp'
  for (const k of KINDS) {
    const b = makeButton(k, 'kind')
    b.dataset.value = k
    b.addEventListener('click', () => {
      selectedKinds.has(k) ? selectedKinds.delete(k) : selectedKinds.add(k)
      apply()
    })
    kindWrap.appendChild(b)
  }
  const all = makeButton('すべて', 'all')
  all.className = 'all'
  all.addEventListener('click', () => {
    selectedRanks.clear()
    selectedSpecies.clear()
    selectedKinds.clear()
    apply()
  })

  bar.append(rankWrap, speciesWrap, kindWrap, all)
  table.insertAdjacentElement('afterend', empty)
  apply()
  return bar
}

export function setupDexFilter(kinds: Kinds | undefined): void {
  if (!document.querySelector('.Layout.monster-dex')) return
  const table = document.querySelector<HTMLTableElement>('.Layout.monster-dex .vp-doc table')
  if (!table || table.dataset.dexFilter === 'yes') return
  const bar = buildBar(table, kinds ?? {})
  if (!bar) return
  table.dataset.dexFilter = 'yes'
  table.parentElement?.insertBefore(bar, table)
}
