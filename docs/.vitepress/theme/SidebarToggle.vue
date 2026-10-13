<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useSidebar } from 'vitepress/theme'

const KEY = 'dqmvi-wiki:sidebar-collapsed'
const { hasSidebar, isSidebarEnabled } = useSidebar()
const collapsed = ref(false)
const label = computed(() => collapsed.value ? 'サイドバーを表示' : 'サイドバーを非表示')
let stopWatching: (() => void) | undefined

function toggle() {
  collapsed.value = !collapsed.value
  try { localStorage.setItem(KEY, String(collapsed.value)) } catch {}
}

function syncStorage(event: StorageEvent) {
  if (event.key === KEY || event.key === null) {
    try { collapsed.value = localStorage.getItem(KEY) === 'true' } catch {}
  }
}

onMounted(() => {
  try { collapsed.value = localStorage.getItem(KEY) === 'true' } catch {}
  const stopLayoutWatch = watch([hasSidebar, collapsed], () => {
    document.documentElement.classList.toggle('wiki-sidebar-collapsed', hasSidebar.value && collapsed.value)
  }, { immediate: true })
  const stopDesktopWatch = watch(isSidebarEnabled, (enabled) => {
    if (!enabled || !document.querySelector('.VPSidebar.open')) return
    document.querySelector<HTMLElement>('.VPBackdrop.backdrop')?.click()
    document.querySelector<HTMLButtonElement>('.sidebar-toggle')?.focus()
  })
  stopWatching = () => { stopLayoutWatch(); stopDesktopWatch() }
  window.addEventListener('storage', syncStorage)
})

onUnmounted(() => {
  stopWatching?.()
  window.removeEventListener('storage', syncStorage)
  document.documentElement.classList.remove('wiki-sidebar-collapsed')
})
</script>

<template>
  <button
    v-if="hasSidebar"
    type="button"
    class="sidebar-toggle"
    :title="label"
    :aria-label="label"
    :aria-expanded="!collapsed"
    aria-controls="VPSidebarNav"
    @click="toggle"
  >
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9 4v16" />
      <path :d="collapsed ? 'm13 9 3 3-3 3' : 'm16 9-3 3 3 3'" />
    </svg>
  </button>
</template>

<style>
.sidebar-toggle { display: none; }

@media (min-width: 960px) {
  .sidebar-toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 44px;
    height: 44px;
    margin-right: 8px;
    border: 1px solid transparent;
    border-radius: 8px;
    background: transparent;
    color: var(--vp-c-text-2);
    cursor: pointer;
    transition: background-color 150ms, color 150ms, border-color 150ms;
  }

  .sidebar-toggle:hover {
    border-color: var(--vp-c-divider);
    background: var(--vp-c-bg-soft);
    color: var(--vp-c-text-1);
  }

  .sidebar-toggle:active {
    background: var(--vp-c-brand-soft);
    color: var(--vp-c-brand-1);
    box-shadow: inset 0 1px 3px var(--press-shadow);
  }

  .sidebar-toggle:focus-visible { outline: 2px solid var(--vp-c-brand-1); outline-offset: 2px; }
  .sidebar-toggle svg { width: 22px; height: 22px; fill: none; stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }

  .wiki-sidebar-collapsed .VPSidebar { display: none; }
  .wiki-sidebar-collapsed .VPContent.has-sidebar {
    padding-left: max(0px, calc((100vw - var(--vp-layout-max-width)) / 2));
    padding-right: max(0px, calc((100vw - var(--vp-layout-max-width)) / 2));
  }
  .wiki-sidebar-collapsed .VPLocalNav.has-sidebar { padding-left: 0; }
  .wiki-sidebar-collapsed .VPNavBar:not(.home) { background-color: var(--vp-nav-bg-color); }
  .wiki-sidebar-collapsed .VPNavBar.has-sidebar .divider { padding-left: 0; }
  .wiki-sidebar-collapsed .VPNavBarTitle.has-sidebar .title { border-bottom-color: transparent; }
}

@media (min-width: 960px) and (max-width: 1100px) {
  .VPNavBar.has-sidebar .DocSearch-Button-Placeholder,
  .VPNavBar.has-sidebar .DocSearch-Button-Keys { display: none; }
  .VPNavBar.has-sidebar .DocSearch-Button { padding: 0 10px; }
}
</style>
