<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useData } from 'vitepress'

const { page, frontmatter, theme, site } = useData()

const show = computed(() => !frontmatter.value.top && !page.value.isNotFound)
const pageUrl = computed(() => {
  const route = page.value.relativePath.replace(/(^|\/)index\.md$/, '$1').replace(/\.md$/, '')
  return new URL(route, theme.value.siteUrl).href
})
const shareText = computed(() => `${page.value.title} | ${site.value.title}`)
const links = computed(() => {
  const url = encodeURIComponent(pageUrl.value)
  const text = encodeURIComponent(shareText.value)
  return [
    { id: 'x', label: 'X', title: 'Xでポストする', href: `https://x.com/intent/post?text=${text}&url=${url}` },
    { id: 'line', label: 'LINE', title: 'LINEで送る', href: `https://social-plugins.line.me/lineit/share?url=${url}` },
    { id: 'hatena', label: 'はてブ', title: 'はてなブックマークに追加する', href: `https://b.hatena.ne.jp/entry/panel/?url=${url}` },
    { id: 'bluesky', label: 'Bluesky', title: 'Blueskyに投稿する', href: `https://bsky.app/intent/compose?text=${encodeURIComponent(`${shareText.value} ${pageUrl.value}`)}` }
  ]
})

const canShare = ref(false)
const copied = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined

onMounted(() => {
  canShare.value = typeof navigator.share === 'function'
})
onUnmounted(() => clearTimeout(timer))

function fallbackCopy(text: string): boolean {
  const area = document.createElement('textarea')
  area.value = text
  area.setAttribute('readonly', '')
  area.style.position = 'fixed'
  area.style.opacity = '0'
  document.body.appendChild(area)
  area.select()
  let ok = false
  try {
    ok = document.execCommand('copy')
  } catch {
    ok = false
  }
  area.remove()
  return ok
}

async function copyLink() {
  let ok = false
  try {
    await navigator.clipboard.writeText(pageUrl.value)
    ok = true
  } catch {
    ok = fallbackCopy(pageUrl.value)
  }
  if (!ok) return
  copied.value = true
  clearTimeout(timer)
  timer = setTimeout(() => { copied.value = false }, 2200)
}

async function shareOther() {
  try {
    await navigator.share({ title: shareText.value, url: pageUrl.value })
  } catch {
    return
  }
}
</script>

<template>
  <section v-if="show" class="share-box" aria-label="このページをシェア">
    <p class="share-title">このページをシェア</p>
    <div class="share-buttons">
      <a
        v-for="link in links"
        :key="link.id"
        class="share-button"
        :class="'share-' + link.id"
        :href="link.href"
        :title="link.title"
        :aria-label="link.title"
        target="_blank"
        rel="noopener noreferrer"
      >{{ link.label }}</a>
      <button type="button" class="share-button share-copy" :class="{ done: copied }" @click="copyLink">
        {{ copied ? 'コピーしました' : 'リンクをコピー' }}
      </button>
      <button v-if="canShare" type="button" class="share-button share-more" @click="shareOther">ほかのアプリ</button>
    </div>
    <span class="visually-hidden" role="status" aria-live="polite">{{ copied ? 'このページのリンクをコピーしました' : '' }}</span>
  </section>
</template>
