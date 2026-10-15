<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useData, withBase } from 'vitepress'
import { SEESAA_URL } from './links'
import { data as recentUpdates } from './recent.data'
import './top-page.css'

const { frontmatter, theme } = useData()

const stats = computed(() => theme.value.siteStats ?? {})

const meta = computed(() => [
  { label: '対応バージョン', value: stats.value.modVersion ?? 'DQMVII' },
  { label: '最終更新', value: stats.value.updated ?? '—' },
  { label: 'ページ数', value: String(stats.value.pages ?? '—') },
  { label: '編集者', value: 'Claude Fable5.1 , よっしー' }
])

const ICONS = {
  book: 'M4 5.5A1.5 1.5 0 0 1 5.5 4H10a2 2 0 0 1 2 2 2 2 0 0 1 2-2h4.5A1.5 1.5 0 0 1 20 5.5v11a1.5 1.5 0 0 1-1.5 1.5H14a2 2 0 0 0-2 2 2 2 0 0 0-2-2H5.5A1.5 1.5 0 0 1 4 16.5zM12 6v13',
  crown: 'M4 8l3.5 3L12 5l4.5 6L20 8l-1.5 9h-13zM6 20h12',
  box: 'M4 8l8-4 8 4v8l-8 4-8-4zM4 8l8 4 8-4M12 12v8',
  pin: 'M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11z M12 10.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z',
  person: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20a7.5 7.5 0 0 1 15 0',
  spark: 'M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2zM19 4.5v3M17.5 6h3',
  sword: 'M14.5 3H21v6.5L11 19.5l-1.5-1.5M14.5 3L5 12.5 6.5 14M6.5 14L4 16.5 7.5 20l2.5-2.5M6.5 14l3.5 3.5',
  shield: 'M12 3l8 3v6c0 5-8 9-8 9s-8-4-8-9V6zM12 7v10M8 11h8',
  ring: 'M9 3h6l2 3-5 4-5-4zM7 9a7 7 0 1 0 10 0',
  flag: 'M6 21V4M6 5h11l-2 3.5L17 12H6',
  help: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9.3A2.5 2.5 0 1 1 12 12c0 1-.001 1.2 0 2M12 17.2v.01',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7.5V12l3 2'
}

const questions = [
  { icon: 'crown', q: 'モンスターを仲間にしたい', a: 'スカウトと配合', link: '/play/scout' },
  { icon: 'person', q: '職業を増やしたい', a: '職業とスキルパネル', link: '/play/skill-panel' },
  { icon: 'sword', q: '装備を作りたい', a: '素材・鍛冶・錬金', link: '/play/smithing' },
  { icon: 'flag', q: '拠点を整えたい', a: 'マイホームの島', link: '/play/home' }
]

const cats = computed(() => [
  {
    id: 'monsters',
    title: 'モンスター',
    icon: 'book',
    overview: { t: 'モンスター図鑑', link: '/monsters/' },
    items: [
      { t: 'モンスター図鑑', link: '/monsters/' },
      { t: '配合表', link: '/monsters/haigou' },
      { t: 'スキル一覧（仲間）', link: '/monsters/skills' },
      { t: '特性一覧', link: '/monsters/traits' }
    ]
  },
  {
    id: 'items',
    title: 'アイテム',
    icon: 'box',
    overview: { t: 'アイテム一覧', link: '/items/' },
    items: [
      { t: '武器', link: '/items/weapons' },
      { t: '防具', link: '/items/armor' },
      { t: 'アクセサリー', link: '/items/accessories' },
      { t: '素材', link: '/items/materials' },
      { t: '魚', link: '/items/fish' }
    ]
  },
  {
    id: 'jobs',
    title: '職業・呪文・特技',
    icon: 'person',
    overview: { t: '職業一覧', link: '/jobs/' },
    items: [
      { t: '職業一覧', link: '/jobs/' },
      { t: '呪文一覧', link: '/spells/' },
      { t: '特技一覧', link: '/skills/' }
    ]
  },
  {
    id: 'play',
    title: '冒険・暮らし',
    icon: 'flag',
    overview: { t: '遊び方ガイド', link: '/play/' },
    items: [
      { t: '世界と旅の扉', link: '/play/worlds' },
      { t: 'ダンジョンと防衛戦', link: '/play/dungeons' },
      { t: 'コロシアム', link: '/play/colosseum' },
      { t: 'マイホームの島', link: '/play/home' },
      { t: '釣り', link: '/play/fishing' }
    ]
  },
  {
    id: 'guide',
    title: 'MOD情報・wiki',
    icon: 'help',
    items: [
      { t: 'DQMVIIとは', link: '/guide/what-is-dqmvii' },
      { t: '導入方法', link: '/guide/install' },
      { t: 'よくある質問', link: '/guide/faq' },
      { t: 'MOD更新履歴', link: '/guide/updates' },
      { t: '情報の送り方', link: '/guide/contribute' }
    ]
  }
])

const catsReady = computed(() => cats.value
  .map((c) => ({ ...c, items: c.items.filter((i) => i.link).map((i) => ({ ...i, parts: i.t.split(/(?<=・)/) })) }))
  .filter((c) => c.id !== 'guide' && c.items.length))

const guidePages = computed(() => {
  const groups = Array.isArray(theme.value.sidebar) ? theme.value.sidebar : []
  return (groups.find((group) => group.text === '遊び方ガイド')?.items ?? [])
    .filter((item) => item.link && item.link !== '/play/')
    .map((item) => ({ t: item.text, link: item.link }))
})

const introLinks = computed(() => cats.value.find((category) => category.id === 'guide').items.slice(0, 3))

const categoryArtStyle = computed(() => ({ backgroundImage: `url("${withBase('/images/home/dq-category-atlas.webp')}")` }))
const wanted = [
  { cat: 'モンスター', t: 'モンスター図鑑', link: '/monsters/' },
  { cat: 'モンスター', t: '配合表', link: '/monsters/haigou' },
  { cat: '仲間', t: 'スキル一覧（仲間）', link: '/monsters/skills' },
  { cat: '職業', t: '職業とスキルパネル', link: '/play/skill-panel' },
  { cat: '世界', t: '世界と旅の扉', link: '/play/worlds' },
  { cat: 'ダンジョン', t: 'ダンジョンと防衛戦', link: '/play/dungeons' }
]

const postUrl = SEESAA_URL || withBase('/guide/contribute')

const query = ref('')
const active = ref(0)
const index = ref(null)
const box = ref(null)
const searchRoot = ref(null)
const searchFocused = ref(false)
const indexFailed = ref(false)
const showResults = computed(() => searchFocused.value && query.value.trim().length > 0)
let indexRequest
let idleTimer
let idleCallback
let searchObserver
let searchTimer

async function loadIndex() {
  if (index.value) return
  if (!indexRequest) {
    indexFailed.value = false
    indexRequest = import('virtual:wiki-index')
      .then((module) => { index.value = module.pages })
      .catch(() => { indexFailed.value = true })
      .finally(() => { indexRequest = undefined })
  }
  return indexRequest
}
onMounted(() => {
  const later = () => { loadIndex() }
  if ('requestIdleCallback' in window) idleCallback = window.requestIdleCallback(later, { timeout: 2500 })
  else idleTimer = setTimeout(later, 800)
})
onUnmounted(() => {
  if (idleCallback !== undefined) window.cancelIdleCallback(idleCallback)
  clearTimeout(idleTimer)
  clearTimeout(searchTimer)
  searchObserver?.disconnect()
})

function focusSearch() {
  searchFocused.value = true
  loadIndex()
}

function blurSearch(event) {
  if (!searchRoot.value?.contains(event.relatedTarget)) searchFocused.value = false
}

function normalize(text) {
  return text
    .replace(/[ぁ-ゖ]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60))
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[\s・()（）]/g, '')
    .toLowerCase()
}

const MAX_HITS = 10

const hits = computed(() => {
  const q = normalize(query.value)
  if (!q || !index.value) return []
  const found = []
  for (const [title, url, kind, keywords] of index.value) {
    const at = normalize(title).indexOf(q)
    let rank = at === 0 ? 0 : at > 0 ? 1 : -1
    if (rank < 0 && keywords && normalize(keywords).includes(q)) rank = 2
    if (rank < 0) continue
    found.push({ title, url, kind, rank, len: title.length })
    if (found.length > 400) break
  }
  found.sort((a, b) => a.rank - b.rank || a.len - b.len)
  return found.slice(0, MAX_HITS)
})

watch(query, () => { active.value = 0; searchFocused.value = true })

function fullTextSearch() {
  const text = query.value
  searchFocused.value = false
  searchObserver?.disconnect()
  clearTimeout(searchTimer)
  const transferQuery = () => {
    const input = document.querySelector('.VPLocalSearchBox input, .DocSearch-Input')
    if (!input) return false
    input.value = text
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.focus()
    searchObserver?.disconnect()
    clearTimeout(searchTimer)
    return true
  }
  searchObserver = new MutationObserver(transferQuery)
  searchObserver.observe(document.body, { childList: true, subtree: true })
  searchTimer = setTimeout(() => searchObserver?.disconnect(), 10000)
  document.querySelector('.DocSearch-Button')?.click()
  transferQuery()
}

function go(hit) {
  if (hit) window.location.href = withBase(hit.url)
}

async function onKey(event) {
  if (event.isComposing || event.keyCode === 229) return
  if (event.key === 'Escape') {
    event.preventDefault()
    searchFocused.value = false
    return
  }
  if (event.key === 'Enter') {
    event.preventDefault()
    if (showResults.value && hits.value.length) go(hits.value[active.value])
    else fullTextSearch()
    return
  }
  if (!hits.value.length) return
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    searchFocused.value = true
    active.value = (active.value + 1) % hits.value.length
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    searchFocused.value = true
    active.value = (active.value - 1 + hits.value.length) % hits.value.length
  }
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    await nextTick()
    document.getElementById('wiki-hit-' + active.value)?.scrollIntoView({ block: 'nearest' })
  }
}
</script>

<template>
  <main v-if="frontmatter.top" class="wiki-home" aria-label="DQMVII攻略wiki トップページ">
      <div class="home-main">
        <header class="wiki-hero">
          <img class="hero-landscape" :src="withBase('/images/home/dq-landscape.webp')" width="2172" height="724" alt="草原と城、旅の扉、スライムがいるブロックの世界" fetchpriority="high">
          <div class="hero-copy">
            <h1><span>DQMVII</span> <span>攻略wiki</span></h1>
            <p class="hero-description">モンスター・装備・職業・冒険の進め方。<br>DQMVIIの攻略情報をまとめています。</p>
          </div>
        </header>

        <div ref="searchRoot" class="wiki-search" role="search" @focusin="focusSearch" @focusout="blurSearch">
          <div class="search-field">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></svg>
            <input
              id="wiki-name-search"
              ref="box"
              v-model="query"
              type="search"
              role="combobox"
              autocomplete="off"
              placeholder="名前・キーワードで検索"
              aria-label="ページの名前で検索"
              aria-autocomplete="list"
              aria-controls="wiki-search-results"
              :aria-expanded="showResults"
              :aria-activedescendant="showResults && hits.length ? 'wiki-hit-' + active : undefined"
              @keydown="onKey"
            >
            <button v-if="query" class="search-clear" type="button" aria-label="検索をクリア" @click="query = ''; box?.focus()">×</button>
            <button class="search-submit" type="button" @click="fullTextSearch">検索<span aria-hidden="true"> →</span></button>
          </div>
          <div v-if="showResults" class="search-results">
            <div id="wiki-search-results" role="listbox" aria-label="ページの候補">
              <a v-for="(hit, i) in hits" :id="'wiki-hit-' + i" :key="hit.url + hit.title" :href="withBase(hit.url)" role="option" tabindex="-1" :aria-selected="i === active" :class="{ on: i === active }" @mouseenter="active = i">
                <span>{{ hit.title }}</span><span class="result-kind">{{ hit.kind }}</span>
              </a>
            </div>
            <p v-if="indexFailed" class="search-message" role="status">候補を読み込めませんでした。本文検索をご利用ください。</p>
            <p v-else-if="!index" class="search-message" role="status">検索データを読み込み中…</p>
            <p v-else-if="!hits.length" class="search-message" role="status">「{{ query }}」に合う名前は見つかりませんでした。</p>
            <button class="search-full" type="button" @click="fullTextSearch">本文も含めて探す <span aria-hidden="true">→</span></button>
          </div>
        </div>

        <div id="home-intro" class="home-intro">
          <span><svg viewBox="0 0 24 24" aria-hidden="true"><path :d="ICONS.flag" /></svg>はじめての方へ</span>
          <a v-for="link in introLinks" :key="link.link" :href="withBase(link.link)">{{ link.t }}</a>
          <a v-if="stats.modVersion && stats.modVersion !== 'DQMVII'" class="home-version-link" :href="withBase('/guide/updates')">対応版 {{ stats.modVersion }}</a>
        </div>

        <div class="home-content">
          <section id="all-categories" class="directory-section" aria-labelledby="directory-heading">
            <h2 id="directory-heading" class="home-section-title"><svg viewBox="0 0 24 24" aria-hidden="true"><path :d="ICONS.book" /></svg>攻略データ</h2>
            <div class="category-directory">
              <section v-for="category in catsReady" :id="'category-' + category.id" :key="category.id" class="directory-group" :class="'directory-group-' + category.id" :aria-labelledby="'category-heading-' + category.id">
                <header class="directory-heading">
                  <div class="directory-heading-copy">
                    <h3 :id="'category-heading-' + category.id">{{ category.title }}</h3>
                    <a class="directory-overview" :href="withBase(category.overview.link)">{{ category.overview.t }}<span aria-hidden="true"> →</span></a>
                  </div>
                  <span class="directory-art" :class="'directory-art-' + category.id" :style="categoryArtStyle" aria-hidden="true"></span>
                </header>
                <ul class="directory-links">
                  <li v-for="item in category.items" :key="item.link"><a class="directory-link" :href="withBase(item.link)"><span><template v-for="(part, k) in item.parts" :key="k"><wbr v-if="k">{{ part }}</template></span><span class="directory-arrow" aria-hidden="true">›</span></a></li>
                </ul>
              </section>
            </div>
          </section>

          <section v-if="recentUpdates.length" id="home-recent" class="recent-section" aria-labelledby="recent-heading">
            <h2 id="recent-heading" class="home-section-title"><svg viewBox="0 0 24 24" aria-hidden="true"><path :d="ICONS.clock" /></svg>最近更新されたページ</h2>
            <ul class="recent-list"><li v-for="item in recentUpdates" :key="item.url"><a :href="withBase(item.url)"><span class="recent-title">{{ item.title }}</span><time :datetime="item.iso">{{ item.date }}</time></a></li></ul>
            <p class="recent-feed"><a :href="withBase('/feed.xml')" type="application/rss+xml">RSSで更新を受け取る</a></p>
          </section>

          <section id="home-guides" class="home-guide-section" aria-labelledby="guide-heading">
            <h2 id="guide-heading" class="home-section-title"><svg viewBox="0 0 24 24" aria-hidden="true"><path :d="ICONS.pin" /></svg>遊び方ガイド</h2>
            <ul class="home-guide-list"><li v-for="guide in guidePages" :key="guide.link"><a :href="withBase(guide.link)">{{ guide.t }}<span aria-hidden="true">›</span></a></li></ul>
          </section>

          <section class="purpose-section" aria-labelledby="purpose-heading">
            <h2 id="purpose-heading" class="home-section-title"><svg viewBox="0 0 24 24" aria-hidden="true"><path :d="ICONS.spark" /></svg>目的から探す</h2>
            <ul class="purpose-list"><li v-for="question in questions" :key="question.q"><a :href="withBase(question.link)"><span>{{ question.q }}</span><b>{{ question.a }} ›</b></a></li></ul>
          </section>

          <section id="home-about" class="contribute-section" aria-labelledby="contribute-heading">
            <h2 id="contribute-heading" class="home-section-title"><svg viewBox="0 0 24 24" aria-hidden="true"><path :d="ICONS.help" /></svg>wikiについて</h2>
            <p>情報はseesaa wikiに、誰でも書き込めます。このサイトでは、集まった情報を見やすく整えて載せています。</p>
            <div class="contribute-links"><a :href="postUrl" :target="SEESAA_URL ? '_blank' : undefined" :rel="SEESAA_URL ? 'noopener noreferrer' : undefined">seesaa wikiに書き込む →</a><a :href="withBase('/guide/contribute')">情報の送り方 →</a><a :href="withBase('/guide/updates')">MOD更新履歴 →</a></div>
            <details id="wanted-pages" class="wanted-pages"><summary>情報を募集しているページ</summary><ul><li v-for="page in wanted" :key="page.cat + page.t"><span>{{ page.cat }}</span><a :href="withBase(page.link)">{{ page.t }}</a></li></ul></details>
          </section>

          <footer class="wiki-about"><p>このwikiは有志で制作しています。掲載情報は検証環境やバージョンによって異なる場合があります。</p><div class="wiki-metadata"><span v-for="item in meta" :key="item.label"><b>{{ item.label }}</b>{{ item.value }}</span></div></footer>
        </div>
      </div>
  </main>
</template>
