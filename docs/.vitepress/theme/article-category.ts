export type ArticleCategoryId = 'monsters' | 'items' | 'jobs' | 'play' | 'guide'

export type ArticleCategory = {
  id: ArticleCategoryId
  title: string
  link: string
}

const categories: Record<ArticleCategoryId, ArticleCategory> = {
  monsters: { id: 'monsters', title: 'モンスター', link: '/monsters/' },
  items: { id: 'items', title: 'アイテム', link: '/items/' },
  jobs: { id: 'jobs', title: '職業・呪文・特技', link: '/jobs/' },
  play: { id: 'play', title: '冒険・暮らし', link: '/play/' },
  guide: { id: 'guide', title: 'MOD情報・wiki', link: '/guide/what-is-dqmvii' }
}

export function articleCategory(relativePath: string): ArticleCategory {
  const section = relativePath.replace(/\\/g, '/').split('/')[0]
  if (section === 'spells' || section === 'skills') return categories.jobs
  if (section === 'monsters' || section === 'items' || section === 'jobs' || section === 'play') {
    return categories[section]
  }
  return categories.guide
}
