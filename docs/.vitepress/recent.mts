import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

export type RecentPage = {
  title: string
  url: string
  description: string
  time: number
  date: string
  iso: string
}

const SKIP_DIRS = new Set(['.vitepress', 'node_modules', 'public'])
const SKIP_PAGES = new Set(['index.md', '404.md'])
const DATE = new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: 'numeric', day: 'numeric' })

function markdownFiles(dir: string, base = ''): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue
    const full = join(dir, name)
    if (statSync(full).isDirectory()) out.push(...markdownFiles(full, `${base}${name}/`))
    else if (name.endsWith('.md')) out.push(`${base}${name}`)
  }
  return out
}

function gitTimes(docs: string): Map<string, number> {
  const times = new Map<string, number>()
  let log = ''
  try {
    log = execFileSync('git', ['-c', 'core.quotepath=false', 'log', '--format=@%ct', '--name-only', '--', docs], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'ignore']
    })
  } catch {
    return times
  }
  let current = 0
  for (const line of log.split('\n')) {
    if (line.startsWith('@')) current = Number(line.slice(1)) * 1000
    else if (line && !times.has(line)) times.set(line, current)
  }
  return times
}

function frontmatterField(text: string, key: string): string {
  const block = text.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? ''
  const line = block.split(/\r?\n/).find((l) => l.startsWith(`${key}:`))
  if (!line) return ''
  const raw = line.slice(key.length + 1).trim()
  if (raw.startsWith('"')) {
    try {
      return String(JSON.parse(raw))
    } catch {
      return raw.slice(1, -1)
    }
  }
  return raw.replace(/^'(.*)'$/, '$1')
}

export function recentPages(docs = 'docs'): RecentPage[] {
  const times = gitTimes(docs)
  const now = Date.now()
  const pages: RecentPage[] = []
  for (const rel of markdownFiles(docs)) {
    if (SKIP_PAGES.has(rel)) continue
    const text = readFileSync(join(docs, rel), 'utf8')
    const title = frontmatterField(text, 'title') || text.match(/^#\s+(.+)$/m)?.[1].trim() || ''
    if (!title) continue
    const time = times.get(`${docs}/${rel}`) || now
    const when = new Date(time)
    pages.push({
      title,
      url: '/' + rel.replace(/(^|\/)index\.md$/, '$1').replace(/\.md$/, ''),
      description: frontmatterField(text, 'description'),
      time,
      date: DATE.format(when),
      iso: when.toISOString()
    })
  }
  return pages.sort((a, b) => b.time - a.time || a.title.localeCompare(b.title, 'ja'))
}

const xml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export function rssFeed(pages: RecentPage[], site: { url: string; title: string; description: string }): string {
  const items = pages.map((page) => {
    const link = new URL(page.url.slice(1), site.url).href
    return [
      '<item>',
      `<title>${xml(page.title)}</title>`,
      `<link>${xml(link)}</link>`,
      `<guid isPermaLink="false">${xml(`${link}#${Math.floor(page.time / 1000)}`)}</guid>`,
      `<pubDate>${new Date(page.time).toUTCString()}</pubDate>`,
      page.description ? `<description>${xml(page.description)}</description>` : '',
      '</item>'
    ].join('')
  })
  const newest = pages.length ? Math.max(...pages.map((page) => page.time)) : Date.now()
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel>',
    `<title>${xml(site.title)}</title>`,
    `<link>${xml(site.url)}</link>`,
    `<description>${xml(site.description)}</description>`,
    '<language>ja</language>',
    `<lastBuildDate>${new Date(newest).toUTCString()}</lastBuildDate>`,
    `<atom:link href="${xml(new URL('feed.xml', site.url).href)}" rel="self" type="application/rss+xml"/>`,
    ...items,
    '</channel></rss>',
    ''
  ].join('\n')
}
