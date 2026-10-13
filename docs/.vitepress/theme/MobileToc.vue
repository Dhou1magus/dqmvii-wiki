<script setup lang="ts">
import { computed } from 'vue'
import { useData, useRoute, type Header } from 'vitepress'
import MobileTocList from './MobileTocList.vue'

const route = useRoute()
const { page, frontmatter, theme } = useData()
const headers = computed(() => {
  const outline = frontmatter.value.outline ?? theme.value.outline
  if (outline === false) return []
  const level = (typeof outline === 'object' && !Array.isArray(outline) ? outline.level : outline) || 2
  const [min, max] = typeof level === 'number' ? [level, level] : level === 'deep' ? [2, 6] : level
  const select = (items: Header[]): Header[] => items.flatMap(item => {
    const children = select(item.children)
    return item.level >= min && item.level <= max ? [{ ...item, children }] : children
  })
  return select(page.value.headers)
})
</script>

<template>
  <details v-if="headers.length" :key="route.path" class="mobile-toc" open>
    <summary>このページの目次</summary>
    <nav aria-label="このページの目次" class="mobile-toc-links">
      <MobileTocList :items="headers" :compact="headers.every(item => !item.children.length)" />
    </nav>
  </details>
</template>

<style>
.mobile-toc { display: none; }

@media (max-width: 767px) {
  .mobile-toc {
    display: block;
    margin: 0 0 28px;
    border: 1px solid var(--vp-c-divider);
    border-radius: 10px;
    background: var(--vp-c-bg-alt);
  }

  .mobile-toc > summary {
    padding: 12px 16px;
    color: var(--vp-c-text-1);
    font-size: 14px;
    font-weight: 700;
    line-height: 24px;
    cursor: pointer;
  }

  .mobile-toc[open] > summary { border-bottom: 1px solid var(--vp-c-divider); }
  .mobile-toc-links { max-height: min(360px, 50svh); overflow-y: auto; padding: 8px; }
  .mobile-toc-list { margin: 0; padding: 0; list-style: none; }
  .mobile-toc-list.compact { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 8px; }
  .mobile-toc-list .mobile-toc-list { padding-left: 16px; }
  .mobile-toc-list a {
    display: flex;
    align-items: center;
    min-height: 44px;
    padding: 8px;
    border-radius: 6px;
    color: var(--vp-c-brand-1);
    font-size: 14px;
    line-height: 1.6;
    overflow-wrap: anywhere;
    text-decoration: none;
  }
  .mobile-toc-list .mobile-toc-list a { color: var(--vp-c-text-2); }
  .mobile-toc-list a:hover,
  .mobile-toc-list a:active { background: var(--vp-c-brand-soft); color: var(--vp-c-brand-1); }
  .mobile-toc a:focus-visible,
  .mobile-toc > summary:focus-visible { outline: 2px solid var(--vp-c-brand-1); outline-offset: -2px; }
}
</style>
