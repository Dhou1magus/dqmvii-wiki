<script setup lang="ts">
type TocItem = { title: string; link: string; children: TocItem[] }

defineProps<{ items: TocItem[]; compact?: boolean }>()

function focusHeading(event: MouseEvent) {
  const href = (event.currentTarget as HTMLAnchorElement).getAttribute('href')
  if (!href?.startsWith('#')) return
  document.getElementById(href.slice(1))?.focus({ preventScroll: true })
}
</script>

<template>
  <ul class="mobile-toc-list" :class="{ compact }">
    <li v-for="item in items" :key="item.link">
      <a :href="item.link" @click="focusHeading">{{ item.title }}</a>
      <MobileTocList v-if="item.children.length" :items="item.children" />
    </li>
  </ul>
</template>
