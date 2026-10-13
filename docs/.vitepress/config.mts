import { defineConfig } from 'vitepress'
import { readdirSync, statSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { isEmptyItemPage, seoHead } from './seo.mts'

const MOD_VERSION = ''

function modVersion(): string {
  const manual = MOD_VERSION.trim()
  return manual ? `DQMVII ${manual}` : 'DQMVII'
}

const MONSTER_IMG_DIR = 'docs/public/img/monsters'
const MONSTER_IMG_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif']
const warnedImages = new Set<string>()
function findMonsterImage(id: string, name: string): string | undefined {
  if (!existsSync(MONSTER_IMG_DIR)) return undefined
  const files = new Map<string, string>()
  for (const f of readdirSync(MONSTER_IMG_DIR)) {
    const ext = f.slice(f.lastIndexOf('.') + 1)
    if (MONSTER_IMG_EXTS.includes(ext)) files.set(f.toLowerCase(), f)
    else if (MONSTER_IMG_EXTS.includes(ext.toLowerCase()) && !warnedImages.has(f)) {
      warnedImages.add(f)
      console.warn(`注意: ${MONSTER_IMG_DIR}/${f} は拡張子を小文字（.${ext.toLowerCase()}）にしないと載りません`)
    }
  }
  for (const stem of [id, name]) {
    if (!stem) continue
    for (const ext of MONSTER_IMG_EXTS) {
      const f = files.get(`${stem}.${ext}`.toLowerCase())
      if (f) return f
    }
  }
  return undefined
}

function countPages(dir: string): number {
  let n = 0
  for (const name of readdirSync(dir)) {
    if (name === '.vitepress' || name === 'node_modules' || name === 'public') continue
    const p = join(dir, name)
    if (statSync(p).isDirectory()) n += countPages(p)
    else if (name.endsWith('.md')) n++
  }
  return n
}

function monsterKinds(): Record<string, string[]> {
  try {
    const raw = JSON.parse(readFileSync('scripts/data/monster-kinds.json', 'utf8')) as Record<string, unknown>
    const out: Record<string, string[]> = {}
    for (const [k, v] of Object.entries(raw)) {
      if (k.startsWith('_') || !Array.isArray(v)) continue
      out[k] = v.map((x) => String(x).trim()).filter(Boolean)
    }
    return out
  } catch (e) {
    console.warn(`注意: scripts/data/monster-kinds.json が読めません（${(e as Error).message}）。図鑑の種類の絞り込みが空になります`)
    return {}
  }
}

const SITE_STATS = {
  pages: countPages('docs'),
  updated: new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' }),
  modVersion: modVersion()
}

const GITHUB_USER = 'Dhou1magus'
const REPO_NAME   = 'dqmvii-wiki'
const SITE_URL    = `https://${GITHUB_USER}.github.io/${REPO_NAME}/`
const SITE_DESCRIPTION = 'MinecraftのドラクエMOD「DQMVII」の攻略wiki。モンスター、装備・アイテム、職業、呪文・特技などの攻略情報をまとめています。'
const GOOGLE_SITE_VERIFICATION = ''

function itemSource(relativePath: string): string {
  return /^items\/[^/]+\.md$/.test(relativePath)
    ? readFileSync(join('docs', relativePath), 'utf8')
    : ''
}

const VIRTUAL_INDEX = 'virtual:wiki-index'

const KIND_BY_DIR: Record<string, string> = {
  monsters: 'モンスター', drops: 'ドロップ品', species: '系統',
  items: '装備・道具', jobs: '職業', spells: '呪文',
  skills: '特技', play: '遊び方', guide: '案内'
}

function buildWikiIndex(dir: string, base = '', out: string[][] = []): string[][] {
  for (const name of readdirSync(dir)) {
    if (name === '.vitepress' || name === 'node_modules' || name === 'public') continue
    const full = join(dir, name)
    if (statSync(full).isDirectory()) {
      buildWikiIndex(full, `${base}${name}/`, out)
      continue
    }
    if (!name.endsWith('.md')) continue
    const text = readFileSync(full, 'utf8')
    const title = text.match(/^title:\s*(.+)$/m)?.[1].trim()
      ?? text.match(/^#\s+(.+)$/m)?.[1].trim()
    if (!title) continue
    if (!text.replace(/^---[\s\S]*?\n---/, '').replace(/^#\s.*$/m, '').trim()) continue
    const url = `/${base}${name === 'index.md' ? '' : name.replace(/\.md$/, '')}`
    if (url === '/') continue
    out.push([title, url, KIND_BY_DIR[base.split('/')[0]] ?? ''])
  }
  return out
}

function wikiIndexPlugin() {
  return {
    name: 'wiki-name-index',
    resolveId: (id: string) => (id === VIRTUAL_INDEX ? `\0${VIRTUAL_INDEX}` : null),
    load(id: string) {
      if (id !== `\0${VIRTUAL_INDEX}`) return null
      const pages = buildWikiIndex('docs')
      const taken = new Set(pages.map(([title]) => title))
      let extra: string[][] = []
      try {
        const groups = JSON.parse(readFileSync('scripts/data/name-index.json', 'utf8'))
        extra = (Object.values(groups) as string[][][]).flat()
          .filter(([title, url]) => title && url && url.startsWith('/') && !taken.has(title))
      } catch {
        extra = []
      }
      return `export const pages = ${JSON.stringify([...pages, ...extra])}\n`
    }
  }
}

export default defineConfig({
  lang: 'ja-JP',
  title: 'DQMVII 攻略wiki',
  description: SITE_DESCRIPTION,

  base: `/${REPO_NAME}/`,

  cleanUrls: true,
  lastUpdated: true,
  metaChunk: true,

  appearance: true,

  sitemap: {
    hostname: SITE_URL,
    transformItems: (items) => items.filter(({ url }) => {
      const relativePath = `${url}${url === '' || url.endsWith('/') ? 'index' : ''}.md`
      return relativePath !== '404.md' && !isEmptyItemPage(relativePath, itemSource(relativePath))
    })
  },

  vite: { plugins: [wikiIndexPlugin()] },

  transformPageData(pageData) {
    if (pageData.frontmatter && 'head' in pageData.frontmatter) {
      console.warn(
        `[security] ${pageData.relativePath} の frontmatter に head があったため無視しました`
      )
      delete pageData.frontmatter.head
    }
    pageData.frontmatter.head = [
      ...seoHead(pageData.relativePath, SITE_URL, itemSource(pageData.relativePath)),
      ['meta', { property: 'og:title', content: pageData.title || 'DQMVII 攻略wiki' }],
      ['meta', { property: 'og:description', content: pageData.description || SITE_DESCRIPTION }]
    ]
  },

  markdown: {
    html: false,
    headers: true,
    linkify: false,
    breaks: true,
    image: { lazyLoading: true },
    attrs: { allowedAttributes: ['id', 'class'] },
    config(md) {
      const esc = (s: string) =>
        s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/\{/g, '&#123;').replace(/\}/g, '&#125;')

      const textRule = md.renderer.rules.text
      md.renderer.rules.text = (tokens, idx, options, env, self) => {
        const out = textRule
          ? textRule(tokens, idx, options, env, self)
          : md.utils.escapeHtml(tokens[idx].content)
        return out.replace(/\{/g, '&#123;').replace(/\}/g, '&#125;')
      }

      const codeRule = md.renderer.rules.code_inline
      md.renderer.rules.code_inline = (tokens, idx, options, env, self) => {
        const out = codeRule
          ? codeRule(tokens, idx, options, env, self)
          : `<code>${md.utils.escapeHtml(tokens[idx].content)}</code>`
        return out
          .replace(/^(<code[^>]*>)([\s\S]*)(<\/code>)$/, (_, open, body, close) => open + body.replace(/([-_/])(?=.)/g, '$1<wbr>') + close)
          .replace(/\{/g, '&#123;').replace(/\}/g, '&#125;')
      }

      const imageRule = md.renderer.rules.image!
      md.renderer.rules.image = (tokens, idx, options, env, self) => {
        const token = tokens[idx]
        const hit = (token.attrGet('src') ?? '').match(/^\/img\/monsters\/([^/]+)\.[A-Za-z0-9]+$/)
        if (hit) {
          const found = findMonsterImage(decodeURIComponent(hit[1]), token.content.trim())
          if (found) {
            token.attrSet('src', `/img/monsters/${encodeURIComponent(found)}`)
          } else {
            token.attrSet('src', '/img/blank.png')
            token.children = []
          }
        }
        return imageRule(tokens, idx, options, env, self)
      }

      const fence = md.renderer.rules.fence!
      md.renderer.rules.fence = (tokens, idx, options, env, self) => {
        const token = tokens[idx]
        if (token.info.trim() !== 'stats') return fence(tokens, idx, options, env, self)

        const lines = token.content
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
        const cells = lines
          .map((line) => {
            const [label, ...rest] = line.split('|')
            let value = rest.join('|').trim()
            const hi = value.endsWith('!')
            if (hi) value = value.slice(0, -1).trim()
            return `<div><b>${esc((label || '').trim())}</b><span${
              hi ? ' class="hi"' : ''
            }>${esc(value)}</span></div>`
          })
          .join('')

        return `<div class="dq-stats" data-n="${lines.length}">${cells}</div>`
      }

      const RANK = /^(SSS|SS|S|A|B|C|D|E)$/
      const NOWRAP_MAX_LENGTH = 14
      const plainLength = (src: string) =>
        [...src.replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[*_`~]/g, '').replace(/\\([\\|*_`])/g, '$1').trim()].length
      md.core.ruler.push('dq_table_columns', (state) => {
        const tokens = state.tokens
        for (let i = 0; i < tokens.length; i++) {
          if (tokens[i].type !== 'table_open') continue
          const cols: { opens: typeof tokens; values: string[]; longest: number }[] = []
          let col = -1
          let inBody = false
          let j = i + 1
          for (; j < tokens.length && tokens[j].type !== 'table_close'; j++) {
            const t = tokens[j]
            if (t.type === 'tbody_open') inBody = true
            else if (t.type === 'tr_open') col = -1
            else if (t.type === 'th_open' || t.type === 'td_open') {
              col++
              const c = (cols[col] ??= { opens: [], values: [], longest: 0 })
              c.opens.push(t)
              const next = tokens[j + 1]
              const src = next?.type === 'inline' ? next.content.trim() : ''
              if (inBody) c.values.push(src)
              c.longest = Math.max(c.longest, plainLength(src))
            }
          }
          for (const c of cols) {
            if (c.values.some((v) => RANK.test(v)) && c.values.every((v) => v === '' || RANK.test(v))) {
              for (const t of c.opens) t.attrJoin('class', 'dq-rank')
            } else if (c.longest <= NOWRAP_MAX_LENGTH) {
              for (const t of c.opens) t.attrJoin('class', 'nowrap')
            }
          }
          i = j
        }
      })

      md.core.ruler.push('dq_tabs', (state) => {
        const tokens = state.tokens
        const isTab = (t: (typeof tokens)[number]) =>
          t.type === 'heading_open' && (t.attrGet('class') ?? '').split(/\s+/).includes('tab')
        const html = (content: string) => {
          const t = new state.Token('html_block', '', 0)
          t.content = content
          return t
        }
        const out: typeof tokens = []
        let i = 0
        while (i < tokens.length) {
          const first = tokens[i]
          if (!isTab(first)) {
            out.push(tokens[i++])
            continue
          }
          const depth = first.level
          const rank = Number(first.tag.slice(1))
          const panels: { label: string; body: typeof tokens }[] = []
          while (i < tokens.length && isTab(tokens[i]) && tokens[i].tag === first.tag && tokens[i].level === depth) {
            const label = (tokens[i + 1].children ?? [])
              .filter((c) => c.type === 'text' || c.type === 'code_inline')
              .map((c) => c.content)
              .join('')
              .trim()
            i += 3
            const body: typeof tokens = []
            while (
              i < tokens.length &&
              tokens[i].level >= depth &&
              !(tokens[i].type === 'heading_open' && tokens[i].level === depth && Number(tokens[i].tag.slice(1)) <= rank)
            ) body.push(tokens[i++])
            panels.push({ label, body })
          }
          const group = (state.env.dqTabs = (state.env.dqTabs ?? 0) + 1)
          const id = (part: string, k: number) => `dq-tabs-${group}-${part}-${k}`
          const buttons = panels
            .map((p, k) =>
              `<button type="button" class="dq-tab" role="tab" id="${id('tab', k)}" aria-controls="${id('panel', k)}" aria-selected="${k === 0}" tabindex="${k === 0 ? 0 : -1}">${esc(p.label)}</button>`)
            .join('')
          out.push(html(`<div class="dq-tabs"><div class="dq-tab-list" role="tablist">${buttons}</div>\n`))
          panels.forEach((p, k) => {
            out.push(html(`<div class="dq-tab-panel" role="tabpanel" id="${id('panel', k)}" aria-labelledby="${id('tab', k)}"${k === 0 ? '' : ' hidden'}>\n`))
            out.push(...p.body)
            out.push(html('</div>\n'))
          })
          out.push(html('</div>\n'))
        }
        state.tokens = out
      })
    }
  },

  head: [
    ...(GOOGLE_SITE_VERIFICATION
      ? [['meta', { name: 'google-site-verification', content: GOOGLE_SITE_VERIFICATION }] as ['meta', Record<string, string>]]
      : []),
    ['meta', { name: 'theme-color', content: '#0F7A4A' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: 'DQMVII 攻略wiki' }],
    ['meta', { property: 'og:locale', content: 'ja_JP' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
    ['link', {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap'
    }]
  ],

  themeConfig: {
    siteStats: SITE_STATS,
    monsterKinds: monsterKinds(),

    nav: [
      { text: '遊び方', link: '/play/' },
      {
        text: 'データ',
        items: [
          { text: 'モンスター図鑑', link: '/monsters/' },
          { text: '配合表', link: '/monsters/haigou' },
          { text: '職業一覧', link: '/jobs/' },
          { text: '呪文一覧', link: '/spells/' },
          { text: '特技一覧', link: '/skills/' },
          { text: 'アイテム一覧', link: '/items/' },
          { text: 'ダンジョンと防衛戦', link: '/play/dungeons' }
        ]
      },
      {
        text: 'wikiについて',
        items: [
          { text: 'MOD更新履歴', link: '/guide/updates' },
          { text: '情報の送り方', link: '/guide/contribute' }
        ]
      }
    ],
    sidebar: [
      {
        text: 'はじめに',
        collapsed: false,
        items: [
          { text: 'DQMVIIとは', link: '/guide/what-is-dqmvii' },
          { text: '導入方法', link: '/guide/install' },
          { text: 'よくある質問', link: '/guide/faq' }
        ]
      },
      {
        text: '遊び方ガイド',
        link: '/play/',
        collapsed: false,
        items: [
          { text: 'はじめての冒険', link: '/play/start' },
          { text: '冒険のきほん', link: '/play/basics' },
          { text: 'スカウトと配合', link: '/play/scout' },
          { text: '仲間のスキルと特性', link: '/play/monster-skills' },
          { text: '仲間の装備と作戦', link: '/play/pets' },
          { text: '職業とスキルパネル', link: '/play/skill-panel' },
          { text: '人間の仲間', link: '/play/companions' },
          { text: '世界と旅の扉', link: '/play/worlds' },
          { text: 'ダンジョンと防衛戦', link: '/play/dungeons' },
          { text: 'コロシアム', link: '/play/colosseum' },
          { text: 'マイホームの島', link: '/play/home' },
          { text: '素材・鍛冶・錬金', link: '/play/smithing' },
          { text: '釣り・メダル・町の遊び', link: '/play/town-fun' },
          { text: '町の物語とクエスト', link: '/play/story' },
          { text: '実績と称号', link: '/play/achievements' }
        ]
      },
      {
        text: 'データ',
        collapsed: false,
        items: [
          {
            text: 'モンスター図鑑',
            link: '/monsters/',
            items: [
              { text: '配合表', link: '/monsters/haigou' },
              { text: 'スキル一覧（仲間）', link: '/monsters/skills' },
              { text: '特性一覧', link: '/monsters/traits' }
            ]
          },
          { text: '職業一覧', link: '/jobs/' },
          { text: '呪文一覧', link: '/spells/' },
          { text: '特技一覧', link: '/skills/' },
          {
            text: 'アイテム一覧',
            link: '/items/',
            items: [
              { text: '武器', link: '/items/weapons' },
              { text: '防具', link: '/items/armor' },
              { text: 'アクセサリー', link: '/items/accessories' },
              { text: '素材', link: '/items/materials' },
              { text: '魚', link: '/items/fish' }
            ]
          }
        ]
      },
      {
        text: 'wikiについて',
        collapsed: false,
        items: [
          { text: 'MOD更新履歴', link: '/guide/updates' },
          { text: '情報の送り方', link: '/guide/contribute' }
        ]
      }
    ],
    search: {
      provider: 'local',
      options: {
        _render(src, env, md) {
          const html = md.render(src.replace(/\n## 関連ページ[^\n]*\n[\s\S]*$/, '\n'), env)
          return env.frontmatter?.search === false ? '' : html
        },
        miniSearch: {
          options: {
            tokenize: (text: string) =>
              text
                .split(/[\s\-_/、。，．,.()（）「」『』【】]+/u)
                .flatMap((w) => {
                  if (!w) return []
                  if (/[ぁ-ヿ一-鿿]/u.test(w)) {
                    const grams: string[] = []
                    for (let i = 0; i < w.length; i++) {
                      grams.push(w[i])
                      if (i + 2 <= w.length) grams.push(w.slice(i, i + 2))
                    }
                    return grams
                  }
                  return [w.toLowerCase()]
                })
          },
          searchOptions: {
            combineWith: 'AND',
            fuzzy: false,
            prefix: false,
            boost: { title: 5, titles: 2, text: 1 }
          }
        },
        translations: {
          button: { buttonText: '検索', buttonAriaLabel: 'サイト内検索' },
          modal: {
            displayDetails: '詳細を表示',
            resetButtonTitle: '検索をリセット',
            backButtonTitle: '閉じる',
            noResultsText: '見つかりませんでした:',
            footer: {
              selectText: '選択',
              selectKeyAriaLabel: 'Enter',
              navigateText: '移動',
              navigateUpKeyAriaLabel: '↑',
              navigateDownKeyAriaLabel: '↓',
              closeText: '閉じる',
              closeKeyAriaLabel: 'Esc'
            }
          }
        }
      }
    },

    lastUpdated: {
      text: '最終更新',
      formatOptions: { dateStyle: 'medium', timeStyle: 'short', forceLocale: true }
    },

    outline: { level: [2, 3], label: 'このページの目次' },
    docFooter: { prev: '前のページ', next: '次のページ' },
    darkModeSwitchLabel: 'テーマ',
    lightModeSwitchTitle: 'ライトモードに切り替え',
    darkModeSwitchTitle: 'ダークモードに切り替え',
    sidebarMenuLabel: 'メニュー',
    returnToTopLabel: 'トップへ戻る',
    externalLinkIcon: true,

    socialLinks: [
      { icon: 'github', link: `https://github.com/${GITHUB_USER}/${REPO_NAME}` }
    ],

    footer: {
      message:
        '有志によるwikiです。記載内容の正確性は保証されません。'
        + ` <a href="/${REPO_NAME}/guide/contribute">情報の送り方</a>`,
      copyright: 'DQMVII 攻略wiki'
    }
  }
})
