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
import ShareButtons from './ShareButtons.vue'
import BackToTop from './BackToTop.vue'
import { articleCategory } from './article-category'
import './custom.css'
import './button-feedback.css'
import './article-theme.css'

export default {
  extends: DefaultTheme,
  Layout() {
    const { page, frontmatter } = useData()
    const category = articleCategory(page.value.relativePath)
    const hasSections = page.value.headers.some((header) => header.title !== '関連ページ' && (header.level > 1 || header.children.length > 0))
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
      'doc-footer-before': () => h(ShareButtons),
      'page-top': () => h(TopPage),
      'layout-bottom': () => h(BackToTop)
    })
  },
  setup() {
    const route = useRoute()
    const { theme } = useData()
    const kinds = () => (theme.value as { monsterKinds?: Kinds }).monsterKinds
    const markBlanks = () => document.querySelectorAll('.vp-doc p').forEach((p) => {
      p.classList.toggle('blank-note', p.textContent?.trim() === '（未記入）')
    })
    const markEmptyTables = () => document.querySelectorAll<HTMLTableElement>('.vp-doc table').forEach((table) => {
      if (table.tBodies[0]?.rows.length) return
      const body = table.tBodies[0] ?? table.createTBody()
      const row = body.insertRow()
      row.className = 'blank-row'
      const cell = row.insertCell()
      cell.colSpan = table.tHead?.rows[0]?.cells.length ?? 1
      cell.textContent = '（未記入）'
    })
    const fitTables = () => document.querySelectorAll<HTMLTableElement>('.Layout:not(.wide-page) .vp-doc table').forEach((table) => {
      table.classList.remove('fit')
      if (table.scrollWidth > table.clientWidth + 1) table.classList.add('fit')
    })
    const openFoldsForHash = () => {
      let id = ''
      try {
        id = decodeURIComponent(location.hash.slice(1))
      } catch {
        return
      }
      const target = id ? document.getElementById(id) : null
      if (!target) return
      let opened = false
      for (let fold = target.closest('details'); fold; fold = fold.parentElement?.closest('details') ?? null) {
        if (!fold.open) {
          fold.open = true
          opened = true
        }
      }
      if (opened) target.scrollIntoView()
    }
    let fitFrame = 0
    const queueFit = () => {
      cancelAnimationFrame(fitFrame)
      fitFrame = requestAnimationFrame(fitTables)
    }
    const decorate = () => { setupSortableTables(); setupTabs(); markFaqTags(); setupDexFilter(kinds()); markBlanks(); markEmptyTables(); queueFit(); openFoldsForHash() }
    onMounted(() => {
      decorate()
      window.addEventListener('resize', queueFit)
      window.addEventListener('hashchange', openFoldsForHash)
      document.addEventListener('click', (event) => {
        if ((event.target as Element | null)?.closest?.('.dq-tab')) queueFit()
      })
    })
    watch(() => route.path, () => nextTick(decorate))
  }
} satisfies Theme
