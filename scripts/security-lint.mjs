#!/usr/bin/env node
/**
 * 本文に、公開サイト上で実行され得る記述が混ざっていないかを検査する。
 *
 * この wiki は config.mts で markdown.html を false にしてあるため、
 * 本文のHTMLはそもそも実行されない。これはその設定を万一戻された場合や、
 * VitePress が本文をVueテンプレートとして扱う経路（{{ }} や v-html）を
 * 塞ぐための二重の防御。
 *
 *   node scripts/security-lint.mjs
 *
 * 問題があれば該当箇所を表示して終了コード1で落ちる。
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const DOCS = 'docs'
const CONFIG = 'docs/.vitepress/config.mts'

const RULES = [
  { re: /<\s*script\b/i, msg: '<script> タグ' },
  { re: /<\s*iframe\b/i, msg: '<iframe> タグ' },
  { re: /<\s*(object|embed|form|base|meta|link)\b/i, msg: '危険なHTMLタグ' },
  { re: /<\s*style\b/i, msg: '<style> タグ' },
  { re: /\son[a-z]{3,}\s*=\s*["'{]/i, msg: 'onclick などのイベント属性' },
  { re: /\{[^}\n]*\bon[a-z]{3,}\s*=/i, msg: '{ } の属性指定に onclick などのイベント属性' },
  { re: /javascript\s*:/i, msg: 'javascript: URL' },
  { re: /data:\s*text\/html/i, msg: 'data:text/html URL' },
  { re: /\{\{/, msg: 'Vueの式展開 {{ }}（本文では使えません）' },
  { re: /\bv-html\b|\bv-bind\b|\bv-on\b|\bv-pre\b|(^|\s)@[a-z]+\s*=/i, msg: 'Vueディレクティブ' },
  { re: /<\s*[a-z-]+\s+[^>]*\bsrcdoc\b/i, msg: 'srcdoc 属性' },
  {
    re: /!\[[^\]]*\]\(\s*(?:[a-z]+:)?\/\//i,
    msg: '外部サイトの画像を直接読み込んでいます（訪問者のIPが相手先に渡ります）。画像は docs/public/ に置いて /ファイル名 で参照してください'
  },
  {
    re: /!\[[^\]]*\]\[/,
    msg: '参照形式の画像（![x][ref]）は使えません。![x](/ファイル名) の形で書いてください'
  }
]

/**
 * 本文ページのfrontmatterに書いてよい項目。
 * ★とくに head は絶対に許可しないこと。
 *   head を許すと、本文のHTMLを無効にしていても
 *   frontmatterに数行書くだけで <script> をページに注入できてしまう。
 */
const ALLOWED_FRONTMATTER = new Set([
  'title', 'titleTemplate', 'description', 'tagline',
  'layout', 'top', 'sidebar', 'aside', 'outline',
  'prev', 'next', 'editLink', 'lastUpdated',
  'pageClass', 'navbar', 'footer', 'hero', 'features',
  'feedback'
])

/**
 * docs配下に置いてよいファイルの種類。
 * ここに無い拡張子は公開サイトに素のまま配信されるため許可しない。
 * とくに .html と .svg は、単体で開いたときにスクリプトが動く。
 */
const ALLOWED_EXT = new Set([
  '.md',
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.ico',
  '.txt', '.gitkeep'
])

/** ドットで始まる名前は .gitkeep 以外を許可しない */
const ALLOWED_DOTFILES = new Set(['.gitkeep'])

/** コードブロックとインラインコードは「文字として表示されるだけ」なので検査対象から外す */
function stripCode(text) {
  return text
    .replace(/^ {0,3}(`{3,}|~{3,})[\s\S]*?^ {0,3}\1\s*$/gm, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/`[^`\n]*`/g, (m) => ' '.repeat(m.length))
}

/**
 * docs配下を走査する。
 * ★除外は「docs直下の .vitepress と node_modules」だけに限ること。
 *   名前だけで判定すると docs/public/node_modules/evil.html のような
 *   フォルダを作られたときに中身が検査されず、公開されてしまう。
 */
const SKIP_TOP = new Set([join(DOCS, '.vitepress'), join(DOCS, 'node_modules')])

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (SKIP_TOP.has(p)) continue
    if (statSync(p).isDirectory()) walk(p, out)
    else out.push(p)
  }
  return out
}

const problems = []
const allFiles = walk(DOCS)

// 0) 置いてよい種類のファイルか
//    docs/public/ に .html や .svg を置かれると、そのファイルが
//    サイトのドメイン上でそのまま開けてしまう（偽ログイン画面など）
for (const file of allFiles) {
  const name = file.split(/[\\/]/).pop()
  if (name.startsWith('.') && !ALLOWED_DOTFILES.has(name)) {
    problems.push({
      file: relative('.', file),
      line: 0,
      msg: 'ドットで始まるファイルは置けません（隠れた状態で公開されてしまうため）',
      text: ''
    })
    continue
  }
  const dot = name.lastIndexOf('.')
  const ext = dot === -1 ? '' : name.slice(dot).toLowerCase()
  if (!ALLOWED_EXT.has(ext)) {
    problems.push({
      file: relative('.', file),
      line: 0,
      msg: `許可されていない種類のファイル（${ext || '拡張子なし'}）。docs配下に置けるのは Markdown と画像だけです`,
      text: ''
    })
  }
}

// 1) 本文の検査
for (const file of allFiles.filter((f) => f.endsWith('.md'))) {
  const raw = readFileSync(file, 'utf8')

  // 1-a) frontmatter（先頭の --- で囲まれた部分）に許可外の項目がないか
  //      prev:/next: の直下だけ、VitePress標準の書式である text/link のネストを許可する
  //      （インデントされていない行に来たら、ネストの親はリセットする）
  const fm = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (fm) {
    const fmStart = 2 // 1行目は ---
    let nestParent = null
    fm[1].split('\n').forEach((line, i) => {
      if (!line.trim()) return
      const indented = /^[ \t]/.test(line)
      if (!indented) nestParent = null

      const m = line.match(/^\s*["']?([A-Za-z_][\w-]*)["']?\s*:(.*)$/)
      if (!m) return
      const [, key, rest] = m

      if (indented && (nestParent === 'prev' || nestParent === 'next') && (key === 'text' || key === 'link')) return

      if (!ALLOWED_FRONTMATTER.has(key)) {
        problems.push({
          file: relative('.', file),
          line: fmStart + i,
          msg:
            key === 'head'
              ? 'frontmatter の head は使えません（ページに任意のタグを差し込めてしまうため）'
              : `frontmatter に使えない項目です: ${key}`,
          text: line.trim().slice(0, 90)
        })
        return
      }
      // 値を持たない（＝この下に入れ子が続く）トップレベルの prev:/next: だけ、次の行の親として覚える
      if (!indented && (key === 'prev' || key === 'next') && !rest.trim()) nestParent = key
    })
  }

  const masked = stripCode(raw)
  masked.split('\n').forEach((line, i) => {
    for (const rule of RULES) {
      if (rule.re.test(line)) {
        problems.push({ file: relative('.', file), line: i + 1, msg: rule.msg, text: raw.split('\n')[i].trim().slice(0, 90) })
      }
    }
  })
}

// 2) 設定の退行チェック（html:false が戻されていないか）
try {
  const cfg = readFileSync(CONFIG, 'utf8')
  const m = cfg.match(/markdown\s*:\s*\{[\s\S]*?html\s*:\s*(true|false)/)
  if (!m) {
    problems.push({ file: CONFIG, line: 0, msg: 'markdown.html の設定が見つかりません', text: '' })
  } else if (m[1] === 'true') {
    problems.push({
      file: CONFIG, line: 0,
      msg: 'markdown.html が true になっています（本文のHTMLが実行可能になります）',
      text: ''
    })
  }
} catch {
  problems.push({ file: CONFIG, line: 0, msg: '設定ファイルを読めませんでした', text: '' })
}

// 3) プレースホルダの置換忘れ
//    CODEOWNERSに実在しないユーザー名が残っていると、GitHubはその行を
//    黙って無視する。保護が効いていないのに効いているように見えるため危険。
for (const f of ['.github/CODEOWNERS', CONFIG]) {
  try {
    if (readFileSync(f, 'utf8').includes('YOUR-GITHUB-NAME')) {
      problems.push({
        file: f, line: 0,
        msg: 'YOUR-GITHUB-NAME が残っています。実際のGitHubユーザー名に置き換えてください（CODEOWNERSは無効なユーザー名の行を黙って無視します）',
        text: ''
      })
    }
  } catch { /* ファイルが無い構成もあるので無視 */ }
}

if (problems.length) {
  console.error('\n セキュリティ検査で問題が見つかりました\n')
  for (const p of problems) {
    console.error(`  ${p.file}${p.line ? ':' + p.line : ''}`)
    console.error(`    → ${p.msg}`)
    if (p.text) console.error(`      ${p.text}`)
    console.error('')
  }
  console.error(` 合計 ${problems.length} 件。取り込む前に修正してください。\n`)
  process.exit(1)
}

console.log('セキュリティ検査: 問題なし')
