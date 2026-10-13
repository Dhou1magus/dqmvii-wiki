import type { TransformContext } from 'vitepress'

export function canonicalUrl(relativePath: string, siteUrl: string): string {
  const route = relativePath
    .replace(/(^|\/)index\.md$/, '$1')
    .replace(/\.md$/, '')
  return new URL(route, siteUrl).href
}

export function isEmptyItemPage(relativePath: string, source: string): boolean {
  return /^items\/[^/]+\.md$/.test(relativePath) &&
    /^---\r?\ntitle:[ \t]*[^\r\n]+\r?\n---\r?\n\s*#[ \t]+[^\r\n]+\s*$/
      .test(source.replace(/^\uFEFF/, ''))
}

export function seoHead(
  relativePath: string,
  siteUrl: string,
  source = ''
): TransformContext['head'] {
  if (relativePath === '404.md') {
    return [['meta', { name: 'robots', content: 'noindex, follow' }]]
  }

  const url = canonicalUrl(relativePath, siteUrl)
  const head: TransformContext['head'] = [
    ['link', { rel: 'canonical', href: url }],
    ['meta', { property: 'og:url', content: url }]
  ]

  if (isEmptyItemPage(relativePath, source)) {
    head.push(['meta', { name: 'robots', content: 'noindex, follow' }])
  }

  return head
}
