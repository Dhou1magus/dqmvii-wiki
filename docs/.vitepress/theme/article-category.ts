export type ArticleCategoryId = 'monsters' | 'items' | 'jobs' | 'play' | 'guide' | 'about'

export type ArticleCategory = {
  id: ArticleCategoryId
  title: string
  link: string
}

const categories: Record<ArticleCategoryId, ArticleCategory> = {
  monsters: { id: 'monsters', title: 'モンスター', link: '/monsters/' },
  items: { id: 'items', title: 'アイテム', link: '/items/' },
  jobs: { id: 'jobs', title: '職業・呪文・特技', link: '/jobs/' },
  play: { id: 'play', title: '遊び方ガイド', link: '/play/' },
  guide: { id: 'guide', title: 'はじめに', link: '/guide/what-is-dqmvii' },
  about: { id: 'about', title: 'wikiについて', link: '/guide/contribute' }
}

export function articleCategory(relativePath: string): ArticleCategory {
  const section = relativePath.replace(/\\/g, '/').split('/')[0]
  if (section === 'spells' || section === 'skills') return categories.jobs
  if (section === 'monsters' || section === 'items' || section === 'jobs' || section === 'play') {
    return categories[section]
  }
  if (/^guide\/(updates|contribute)\.md$/.test(relativePath.replace(/\\/g, '/'))) return { ...categories.about, id: 'guide' }
  return categories.guide
}
