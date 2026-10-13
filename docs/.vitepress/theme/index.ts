import { Fragment, h, nextTick, onMounted, watch } from 'vue'
import DefaultTheme from 'vitepress/theme'
import { useRoute, useData, withBase } from 'vitepress'
import type { Theme } from 'vitepress'
import { setupSortableTables } from './sortable-tables'
import { setupTabs } from './tabs'
import { markFaqTags } from './faq-tags'
import { setupDexFilter, type Kinds } from './dex-filter'
import ThemeSwitch from './ThemeSwitch.vue'
import SidebarToggle from './SidebarToggle.vue'
import MobileToc from './MobileToc.vue'
import TopPage from './TopPage.vue'
import ArticleHeader from './ArticleHeader.vue'
import { articleCategory } from './article-category'
import './custom.css'
import './button-feedback.css'
import './article-theme.css'

export default {
  extends: DefaultTheme,
  Layout() {
    const { page, frontmatter } = useData()
    const category = articleCategory(page.value.relativePath)
    const hasSections = page.value.headers.some((header) => header.level > 1 || header.children.length > 0)
    return h(DefaultTheme.Layout, {
      class: ['wiki-themed', frontmatter.value.top ? 'wiki-top' : 'wiki-article', 'article-category-' + category.id, { 'article-no-outline': !frontmatter.value.top && !hasSections }],
      style: {
        '--article-landscape': `url("${withBase('/images/home/dq-landscape.webp')}")`,
        '--article-atlas': `url("${withBase('/images/home/dq-category-atlas.webp')}")`
      }
    }, {
      'nav-bar-content-before': () => h(SidebarToggle),
      'nav-bar-content-after': () => h(ThemeSwitch),
      'nav-screen-content-after': () => h(ThemeSwitch),
      'doc-before': () => h(Fragment, null, [h(ArticleHeader), h(MobileToc)]),
      'page-top': () => h(TopPage)
    })
  },
  setup() {
    const route = useRoute()
    const { theme } = useData()
    const kinds = () => (theme.value as { monsterKinds?: Kinds }).monsterKinds
    const decorate = () => { setupSortableTables(); setupTabs(); markFaqTags(); setupDexFilter(kinds()) }
    onMounted(decorate)
    watch(() => route.path, () => nextTick(decorate))
  }
} satisfies Theme
