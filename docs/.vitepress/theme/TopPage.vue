<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useData, withBase } from 'vitepress'
import { SEESAA_URL } from './links'
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
  help: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9.3A2.5 2.5 0 1 1 12 12c0 1-.001 1.2 0 2M12 17.2v.01'
}

const questions = [
  { icon: 'crown', q: 'モンスターを仲間にしたい', a: 'スカウトと配合', link: '/play/scout' },
  { icon: 'person', q: '職業を増やしたい', a: '職業とスキルパネル', link: '/play/skill-panel' },
  { icon: 'sword', q: '装備を作りたい', a: '素材・鍛冶・錬金', link: '/play/smithing' },
  { icon: 'flag', q: '拠点を整えたい', a: 'マイホームの島', link: '/play/home' }
]

const start = [
  { n: '01', t: 'はじめての冒険', d: 'はじまりの神殿から出発', link: '/play/start' },
  { n: '02', t: 'スカウトと配合', d: '仲間にする・配合する', link: '/play/scout' },
  { n: '03', t: '職業とスキルパネル', d: 'パネルの取り方', link: '/play/skill-panel' }
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
      { t: '釣り・メダル・町の遊び', link: '/play/town-fun' }
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
  .map((c) => ({ ...c, items: c.items.filter((i) => i.link) }))
  .filter((c) => c.items.length))

const wanted = [
  { cat: 'モンスター', t: 'モンスター図鑑', link: '/monsters/' },
  { cat: 'アイテム', t: 'アイテム一覧', link: '/items/' },
  { cat: '職業', t: '職業一覧', link: '/jobs/' },
  { cat: '仲間', t: 'スキル一覧（仲間）', link: '/monsters/skills' },
  { cat: '世界', t: '世界と旅の扉', link: '/play/worlds' },
  { cat: 'ダンジョン', t: 'ダンジョンと防衛戦', link: '/play/dungeons' }
]

const log = []

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
    <header class="wiki-hero">
      <div class="hero-heading">
        <div>
          <h1>DQMVII <span>攻略wiki</span></h1>
          <p class="hero-description">{{ frontmatter.tagline }}</p>
        </div>
        <a class="version-link" :href="withBase('/guide/updates')"><span>掲載データの対応版</span><b>{{ stats.modVersion }}</b><span>MOD更新履歴 →</span></a>
      </div>
      <div ref="searchRoot" class="wiki-search" @focusin="focusSearch" @focusout="blurSearch">
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
            <a v-for="(h, i) in hits" :id="'wiki-hit-' + i" :key="h.url + h.title" :href="withBase(h.url)" role="option" tabindex="-1" :aria-selected="i === active" :class="{ on: i === active }" @mouseenter="active = i">
              <span>{{ h.title }}</span><span class="result-kind">{{ h.kind }}</span>
            </a>
          </div>
          <p v-if="indexFailed" class="search-message" role="status">候補を読み込めませんでした。本文検索をご利用ください。</p>
          <p v-else-if="!index" class="search-message" role="status">検索データを読み込み中…</p>
          <p v-else-if="!hits.length" class="search-message" role="status">「{{ query }}」に合う名前は見つかりませんでした。</p>
          <button class="search-full" type="button" @click="fullTextSearch">本文も含めて探す <span aria-hidden="true">→</span></button>
        </div>
      </div>
      <div class="hero-shortcuts"><span>すぐに見る</span><a :href="withBase('/monsters/')">モンスター図鑑</a><a :href="withBase('/items/')">アイテム一覧</a><a :href="withBase('/guide/faq')">よくある質問</a><a href="#all-categories">カテゴリ一覧</a></div>
    </header>

    <div class="home-content">
      <section id="all-categories" class="directory-section" aria-label="攻略カテゴリ">
        <div class="category-directory">
          <section v-for="c in catsReady" :key="c.id" class="directory-group" :class="{ 'directory-group-wide': c.items.length > 12, 'directory-group-training': c.id === 'training' }" :aria-labelledby="'category-' + c.id">
            <header class="directory-heading">
              <h2 :id="'category-' + c.id"><svg viewBox="0 0 24 24" aria-hidden="true"><path :d="ICONS[c.icon]" /></svg>{{ c.title }}</h2>
              <a v-if="c.overview" class="directory-overview" :href="withBase(c.overview.link)">{{ c.overview.t }}<span aria-hidden="true"> →</span></a>
            </header>
            <ul class="directory-links">
              <li v-for="i in c.items" :key="i.t"><a class="directory-link" :href="withBase(i.link)"><span>{{ i.t }}</span><span class="directory-arrow" aria-hidden="true">›</span></a></li>
            </ul>
          </section>
        </div>
      </section>

      <div class="home-guides">
        <aside class="beginner-panel" aria-labelledby="beginner-heading">
          <div class="beginner-heading"><svg viewBox="0 0 24 24" aria-hidden="true"><path :d="ICONS.flag" /></svg><h2 id="beginner-heading">はじめての冒険</h2></div>
          <p>まずはここから読み進めよう。</p>
          <ol class="beginner-steps">
            <li v-for="s in start" :key="s.n"><a :href="withBase(s.link)"><span class="step-number">{{ s.n }}</span><span><b>{{ s.t }}</b><small>{{ s.d }}</small></span><span class="step-arrow" aria-hidden="true">›</span></a></li>
          </ol>
          <a class="guide-link" :href="withBase('/play/')">遊び方ガイドをすべて見る <span aria-hidden="true">→</span></a>
        </aside>
        <section class="purpose-section" aria-labelledby="purpose-heading">
          <div class="section-heading"><h2 id="purpose-heading">やりたいことから探す</h2></div>
          <div class="purpose-grid">
            <a v-for="q in questions" :key="q.q" :href="withBase(q.link)"><svg viewBox="0 0 24 24" aria-hidden="true"><path :d="ICONS[q.icon]" /></svg><span><b>{{ q.q }}</b><small>{{ q.a }}</small></span><span aria-hidden="true">›</span></a>
          </div>
          <a class="guide-link" :href="withBase('/guide/faq')">よくある質問を見る <span aria-hidden="true">→</span></a>
        </section>
      </div>

      <div class="community-grid">
        <section class="updates-section" aria-labelledby="updates-heading">
          <div class="section-heading"><h2 id="updates-heading">wikiのお知らせ</h2><a :href="withBase('/guide/updates')">MOD更新履歴 →</a></div>
          <ul class="wiki-updates"><li v-for="l in log.slice(0, 6)" :key="l.t"><time>{{ l.d }}</time><a :href="withBase(l.link)">{{ l.t }}</a><span>{{ l.who }}</span></li></ul>
          <details v-if="log.length > 6" class="wiki-updates-archive">
            <summary>これまでのお知らせ（{{ log.length - 6 }}件）</summary>
            <ul class="wiki-updates"><li v-for="l in log.slice(6)" :key="l.t"><time>{{ l.d }}</time><a :href="withBase(l.link)">{{ l.t }}</a><span>{{ l.who }}</span></li></ul>
          </details>
        </section>
        <section class="contribute-panel" aria-labelledby="contribute-heading">
          <h2 id="contribute-heading">みんなで集める攻略情報</h2><p>情報はseesaa wikiに、誰でも書き込めます。このサイトでは、集まった情報を見やすく整えて載せています。</p><div class="contribute-links"><a :href="postUrl">seesaa wikiに書き込む →</a><a :href="withBase('/guide/contribute')">情報の送り方 →</a></div>
          <details id="wanted-pages" class="wanted-pages"><summary>情報を募集しているページ</summary><ul><li v-for="w in wanted" :key="w.cat + w.t"><span>{{ w.cat }}</span><a :href="withBase(w.link)">{{ w.t }}</a></li></ul></details>
        </section>
      </div>
      <footer class="wiki-about"><p>このwikiは有志で制作しています。掲載情報は検証環境やバージョンによって異なる場合があります。</p><div class="wiki-metadata"><span v-for="m in meta" :key="m.label"><b>{{ m.label }}</b>{{ m.value }}</span></div></footer>
    </div>
  </main>
</template>
