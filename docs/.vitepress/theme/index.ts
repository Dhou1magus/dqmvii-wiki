import { h, nextTick, onMounted, watch } from 'vue'
import DefaultTheme from 'vitepress/theme'
import { useRoute, useData } from 'vitepress'
import type { Theme } from 'vitepress'
import { setupSortableTables } from './sortable-tables'
import { setupTabs } from './tabs'
import { markFaqTags } from './faq-tags'
import { setupDexFilter, type Kinds } from './dex-filter'
import ThemeSwitch from './ThemeSwitch.vue'
import SidebarToggle from './SidebarToggle.vue'
import MobileToc from './MobileToc.vue'
import TopPage from './TopPage.vue'
import './custom.css'
import './button-feedback.css'

export default {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      'nav-bar-content-before': () => h(SidebarToggle),
      'nav-bar-content-after': () => h(ThemeSwitch),
      'nav-screen-content-after': () => h(ThemeSwitch),
      'doc-before': () => h(MobileToc),
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
