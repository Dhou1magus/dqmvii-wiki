type Md = any
type State = any
type Tok = any

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/\{/g, '&#123;').replace(/\}/g, '&#125;')

const TERMINATORS = new Set([
  0x0a, 0x21, 0x23, 0x24, 0x25, 0x26, 0x27, 0x28, 0x2a, 0x2b, 0x2d, 0x3a, 0x3c, 0x3d, 0x3e,
  0x40, 0x5b, 0x5c, 0x5d, 0x5e, 0x5f, 0x60, 0x7b, 0x7d, 0x7e
])

const THEME_COLORS: Record<string, string> = {
  red: 'red', blue: 'blue', green: 'green', orange: 'orange', purple: 'purple', pink: 'pink',
  gray: 'gray', grey: 'gray', brown: 'brown', navy: 'navy', teal: 'teal', yellow: 'yellow',
  black: 'black', white: 'white'
}

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i
const WORD = /^[a-z]{3,20}$/i
const ANCHOR_ID = /^[A-Za-z0-9_\-:.]{1,64}$/
const FOLD_OPEN = /^\[([+-])\](.*)$/
const PRE_OPEN = /^=\|([^|]*)\|$/
const CONTENTS = /^#contents(?:\(\d*\))?$/
const AMP = /^&([a-zA-Z]+)\(([^()\n]*)\)/

function safeColor(value: string): string | null {
  const v = value.trim()
  return HEX.test(v) || WORD.test(v) ? v.toLowerCase() : null
}

function lineText(state: State, line: number): string {
  return state.src.slice(state.bMarks[line] + state.tShift[line], state.eMarks[line])
}

function indented(state: State, line: number): boolean {
  return state.sCount[line] - state.blkIndent >= 4
}

function foldRule(state: State, startLine: number, endLine: number, silent: boolean): boolean {
  if (indented(state, startLine)) return false
  const m = FOLD_OPEN.exec(lineText(state, startLine).trim())
  if (!m) return false
  let depth = 1
  let line = startLine + 1
  for (; line < endLine; line++) {
    const t = lineText(state, line).trim()
    if (FOLD_OPEN.test(t)) depth++
    else if (t === '[END]' && --depth === 0) break
  }
  if (depth) return false
  if (silent) return true

  const open = state.push('dq_fold_open', 'details', 1)
  open.markup = m[1]
  open.block = true
  open.map = [startLine, line + 1]
  state.push('dq_fold_summary_open', 'summary', 1)
  const title = m[2].trim()
  if (title) {
    const inline = state.push('inline', '', 0)
    inline.content = title
    inline.map = [startLine, startLine + 1]
    inline.children = []
  } else {
    state.push('dq_fold_label', 'span', 0)
  }
  state.push('dq_fold_summary_close', 'summary', -1)
  state.push('dq_fold_body_open', 'div', 1)

  const oldParent = state.parentType
  const oldLineMax = state.lineMax
  state.parentType = 'dq_fold'
  state.lineMax = line
  state.md.block.tokenize(state, startLine + 1, line)
  state.parentType = oldParent
  state.lineMax = oldLineMax

  state.push('dq_fold_body_close', 'div', -1)
  state.push('dq_fold_close', 'details', -1)
  state.line = line + 1
  return true
}

function preRule(state: State, startLine: number, endLine: number, silent: boolean): boolean {
  if (indented(state, startLine)) return false
  if (!PRE_OPEN.test(lineText(state, startLine).trim())) return false
  let line = startLine + 1
  while (line < endLine && lineText(state, line).trim() !== '||=') line++
  if (line >= endLine) return false
  if (silent) return true
  const token = state.push('fence', 'code', 0)
  token.info = 'text'
  token.markup = '```'
  token.content = state.getLines(startLine + 1, line, state.sCount[startLine], true)
  token.map = [startLine, line + 1]
  state.line = line + 1
  return true
}

function contentsRule(state: State, startLine: number, _endLine: number, silent: boolean): boolean {
  if (indented(state, startLine)) return false
  if (!CONTENTS.test(lineText(state, startLine).trim())) return false
  if (!silent) state.line = startLine + 1
  return true
}

function textRule(state: State, silent: boolean): boolean {
  let pos = state.pos
  while (pos < state.posMax && !TERMINATORS.has(state.src.charCodeAt(pos))) pos++
  if (pos === state.pos) return false
  if (!silent) state.pending += state.src.slice(state.pos, pos)
  state.pos = pos
  return true
}

function wrap(
  state: State, silent: boolean, innerStart: number, innerEnd: number, after: number,
  open: () => void, close: () => void
): boolean {
  if (innerEnd <= innerStart) return false
  if (silent) {
    state.pos = after
    return true
  }
  open()
  const oldMax = state.posMax
  state.pos = innerStart
  state.posMax = innerEnd
  state.md.inline.tokenize(state)
  state.posMax = oldMax
  close()
  state.pos = after
  return true
}

function span(state: State, attrs: [string, string][]): () => void {
  return () => {
    const t = state.push('dq_span_open', 'span', 1)
    t.attrs = attrs
  }
}

function closeTag(state: State, type: string, tag: string): () => void {
  return () => { state.push(type, tag, -1) }
}

function pair(
  state: State, silent: boolean, pos: number, end: number,
  delim: string, type: string, tag: string, skip: string | null
): boolean {
  const src = state.src
  const from = pos + delim.length
  let i = from
  let close = -1
  while (i < end) {
    if (skip && src.startsWith(skip, i)) {
      const next = src.indexOf(skip, i + skip.length)
      if (next < 0 || next >= end) break
      i = next + skip.length
      continue
    }
    if (src.startsWith(delim, i)) {
      close = i
      break
    }
    i++
  }
  if (close <= from) return false
  return wrap(state, silent, from, close, close + delim.length,
    () => { state.push(type + '_open', tag, 1).markup = delim },
    () => { state.push(type + '_close', tag, -1).markup = delim })
}

function matchBrace(src: string, open: number, end: number): number {
  let depth = 0
  for (let i = open; i < end; i++) {
    const c = src.charCodeAt(i)
    if (c === 0x7b) depth++
    else if (c === 0x7d && --depth === 0) return i
  }
  return -1
}

function note(state: State, silent: boolean, pos: number, end: number): boolean {
  const close = state.src.indexOf('))', pos + 2)
  if (close < 0 || close >= end || close === pos + 2) return false
  if (!silent) {
    const notes: string[] = (state.env.dqNotes ??= [])
    notes.push(state.src.slice(pos + 2, close))
    state.push('dq_note_ref', 'sup', 0).meta = { n: notes.length }
  }
  state.pos = close + 2
  return true
}

function amp(state: State, silent: boolean, pos: number, end: number): boolean {
  const src = state.src
  if (src.startsWith('&br;', pos)) {
    if (!silent) state.push('hardbreak', 'br', 0)
    state.pos = pos + 4
    return true
  }
  const m = AMP.exec(src.slice(pos, end))
  if (!m) return false
  const name = m[1].toLowerCase()
  const arg = m[2].trim()
  const argsEnd = pos + m[0].length
  const brace = src.charCodeAt(argsEnd) === 0x7b ? matchBrace(src, argsEnd, end) : -1

  if (name === 'aname') {
    if (!ANCHOR_ID.test(arg)) return false
    if (brace < 0) {
      if (!silent) state.push('html_inline', '', 0).content = `<span id="${arg}" class="dq-anchor"></span>`
      state.pos = argsEnd
      return true
    }
    return wrap(state, silent, argsEnd + 1, brace, brace + 1,
      span(state, [['id', arg], ['class', 'dq-anchor']]), closeTag(state, 'dq_span_close', 'span'))
  }
  if (brace < 0) return false
  const start = argsEnd + 1
  const after = brace + 1

  if (name === 'color') {
    const [fgRaw = '', bgRaw = ''] = arg.split(',')
    const fg = fgRaw.trim() ? safeColor(fgRaw) : ''
    const bg = bgRaw.trim() ? safeColor(bgRaw) : ''
    if (fg === null || bg === null || (!fg && !bg)) return false
    const classes = ['dq-color']
    const style: string[] = []
    if (fg && THEME_COLORS[fg]) classes.push('dq-c-' + THEME_COLORS[fg])
    else if (fg) style.push(`color:${fg}`)
    if (bg) {
      classes.push(fg ? 'dq-bg' : 'dq-bg dq-bg-only')
      style.push(`background-color:${bg}`)
    }
    const attrs: [string, string][] = [['class', classes.join(' ')]]
    if (style.length) attrs.push(['style', style.join(';')])
    return wrap(state, silent, start, brace, after, span(state, attrs), closeTag(state, 'dq_span_close', 'span'))
  }
  if (name === 'size') {
    if (!/^\d{1,3}$/.test(arg)) return false
    const px = Math.min(32, Math.max(10, Number(arg)))
    return wrap(state, silent, start, brace, after,
      span(state, [['class', 'dq-size'], ['style', `font-size:${px}px`]]), closeTag(state, 'dq_span_close', 'span'))
  }
  if (name === 'sup') {
    return wrap(state, silent, start, brace, after,
      () => { state.push('dq_sup_open', 'sup', 1) }, closeTag(state, 'dq_sup_close', 'sup'))
  }
  if (name === 'ruby') {
    if (!arg) return false
    return wrap(state, silent, start, brace, after,
      () => { state.push('dq_ruby_open', 'ruby', 1) },
      () => {
        state.push('html_inline', '', 0).content = `<rp>(</rp><rt>${esc(arg)}</rt><rp>)</rp>`
        state.push('dq_ruby_close', 'ruby', -1)
      })
  }
  if (name === 'align') {
    const a = arg.toLowerCase()
    if (a !== 'left' && a !== 'center' && a !== 'right') return false
    return wrap(state, silent, start, brace, after,
      span(state, [['class', `dq-align dq-align-${a}`]]), closeTag(state, 'dq_span_close', 'span'))
  }
  return false
}

function seesaaInline(state: State, silent: boolean): boolean {
  const src = state.src
  const pos = state.pos
  const ch = src.charCodeAt(pos)
  if (ch !== 0x27 && ch !== 0x25 && ch !== 0x7e && ch !== 0x28 && ch !== 0x26) return false
  const nl = src.indexOf('\n', pos)
  const end = nl < 0 || nl > state.posMax ? state.posMax : nl

  if (ch === 0x7e) {
    if (src.charCodeAt(pos + 1) !== 0x7e) return false
    if (!silent) state.push('hardbreak', 'br', 0)
    state.pos = pos + 2
    return true
  }
  if (ch === 0x27) {
    if (src.startsWith("'''", pos)) return pair(state, silent, pos, end, "'''", 'em', 'em', null)
    if (src.startsWith("''", pos)) return pair(state, silent, pos, end, "''", 'strong', 'strong', "'''")
    return false
  }
  if (ch === 0x25) {
    if (src.startsWith('%%%', pos)) return pair(state, silent, pos, end, '%%%', 'dq_u', 'u', null)
    if (src.startsWith('%%', pos)) return pair(state, silent, pos, end, '%%', 's', 's', '%%%')
    return false
  }
  if (ch === 0x28) return src.startsWith('((', pos) ? note(state, silent, pos, end) : false
  return amp(state, silent, pos, end)
}

function inlineText(token: Tok | undefined): string {
  return (token?.children ?? []).filter((c: Tok) => c.type === 'text').map((c: Tok) => c.content).join('').trim()
}

function notesRule(state: State): void {
  const notes: string[] | undefined = state.env.dqNotes
  if (state.inlineMode || !notes?.length) return
  const T = state.Token
  const html = (content: string) => {
    const t = new T('html_block', '', 0)
    t.content = content
    return t
  }
  const out: Tok[] = [html('<section class="dq-notes" aria-label="注釈"><p class="dq-notes-title">注釈</p><ol>\n')]
  notes.slice().forEach((text, k) => {
    const n = k + 1
    out.push(html(`<li id="dq-note-${n}">`))
    const inline = new T('inline', '', 0)
    inline.content = text
    inline.children = []
    state.md.inline.parse(text, state.md, state.env, inline.children)
    out.push(inline)
    out.push(html(` <a class="dq-note-back" href="#dq-note-ref-${n}" aria-label="本文の${n}番目の注釈へ戻る">↩</a></li>\n`))
  })
  out.push(html('</ol></section>\n'))
  const at = state.tokens.findIndex((t: Tok, i: number) =>
    t.type === 'heading_open' && inlineText(state.tokens[i + 1]).startsWith('関連ページ'))
  if (at < 0) state.tokens.push(...out)
  else state.tokens.splice(at, 0, ...out)
}

type Cell = { open: number; colspan: number; rowspan: number }

function mergeCellsRule(state: State): void {
  const tokens: Tok[] = state.tokens
  const drop = new Set<number>()
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].type !== 'table_open') continue
    const rows: { section: string; cells: number[] }[] = []
    let section = ''
    let j = i + 1
    for (; j < tokens.length && tokens[j].type !== 'table_close'; j++) {
      const t = tokens[j]
      if (t.type === 'thead_open') section = 'thead'
      else if (t.type === 'tbody_open') section = 'tbody'
      else if (t.type === 'tr_open') rows.push({ section, cells: [] })
      else if ((t.type === 'th_open' || t.type === 'td_open') && rows.length) rows[rows.length - 1].cells.push(j)
    }
    const grid: (Cell | undefined)[][] = []
    const touched: Cell[] = []
    rows.forEach((row, r) => {
      grid[r] = []
      let carry = 0
      const grown = new Set<Cell>()
      row.cells.forEach((open, c) => {
        const text = (tokens[open + 1]?.content ?? '').trim()
        const last = c === row.cells.length - 1
        if (text === '>' && !last) {
          carry++
          drop.add(open)
          return
        }
        if (text === '^' && !carry && r > 0 && rows[r - 1].section === row.section) {
          const above = grid[r - 1][c]
          if (above) {
            if (!grown.has(above)) {
              above.rowspan++
              grown.add(above)
            }
            grid[r][c] = above
            drop.add(open)
            return
          }
        }
        const cell: Cell = { open, colspan: carry + 1, rowspan: 1 }
        for (let k = c - carry; k <= c; k++) grid[r][k] = cell
        carry = 0
        touched.push(cell)
      })
    })
    for (const cell of touched) {
      if (cell.colspan > 1) tokens[cell.open].attrSet('colspan', String(cell.colspan))
      if (cell.rowspan > 1) tokens[cell.open].attrSet('rowspan', String(cell.rowspan))
    }
    i = j
  }
  if (!drop.size) return
  state.tokens = tokens.filter((_, k) => !drop.has(k) && !drop.has(k - 1) && !drop.has(k - 2))
}

function headlessTablesRule(state: State): void {
  const tokens: Tok[] = state.tokens
  const drop = new Set<number>()
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].type !== 'thead_open') continue
    let j = i + 1
    let blank = true
    for (; j < tokens.length && tokens[j].type !== 'thead_close'; j++) {
      if (tokens[j].type === 'inline' && tokens[j].content.trim()) blank = false
    }
    if (blank && j < tokens.length) for (let k = i; k <= j; k++) drop.add(k)
    i = j
  }
  if (drop.size) state.tokens = tokens.filter((_, k) => !drop.has(k))
}

export function seesaaSyntax(md: Md): void {
  md.disable('strikethrough')
  md.inline.ruler.at('text', textRule)
  md.inline.ruler.before('emphasis', 'dq_seesaa_inline', seesaaInline)
  const alt = { alt: ['paragraph', 'reference', 'blockquote', 'list'] }
  md.block.ruler.before('fence', 'dq_pre', preRule, alt)
  md.block.ruler.before('reference', 'dq_fold', foldRule, alt)
  md.block.ruler.before('heading', 'dq_contents', contentsRule, alt)
  md.core.ruler.before('normalize', 'dq_notes_reset', (state: State) => {
    if (!state.inlineMode) state.env.dqNotes = []
  })
  md.core.ruler.push('dq_notes', notesRule)
  md.core.ruler.push('dq_merge_cells', mergeCellsRule)
  md.core.ruler.push('dq_headless_tables', headlessTablesRule)

  const r = md.renderer.rules
  r.dq_fold_open = (tokens: Tok[], idx: number) => `<details class="dq-fold"${tokens[idx].markup === '-' ? ' open' : ''}>\n`
  r.dq_fold_summary_open = () => '<summary class="dq-fold-title">'
  r.dq_fold_label = () => '<span class="dq-fold-label"></span>'
  r.dq_fold_summary_close = () => '</summary>\n'
  r.dq_fold_body_open = () => '<div class="dq-fold-body">\n'
  r.dq_fold_body_close = () => '</div>\n'
  r.dq_fold_close = () => '</details>\n'
  r.dq_note_ref = (tokens: Tok[], idx: number) => {
    const n = tokens[idx].meta.n
    return `<sup class="dq-note-ref"><a id="dq-note-ref-${n}" href="#dq-note-${n}" aria-label="注釈${n}">*${n}</a></sup>`
  }
}
