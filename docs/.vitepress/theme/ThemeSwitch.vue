<script setup>
import { onMounted, onUnmounted, ref } from 'vue'

const KEY = 'vitepress-theme-appearance'
const mode = ref('auto')
let mq = null
let onSystemChange = null

function systemPrefersDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function apply(v) {
  const dark = v === 'dark' || (v === 'auto' && systemPrefersDark())
  document.documentElement.classList.toggle('dark', dark)
}

function set(v) {
  mode.value = v
  try {
    localStorage.setItem(KEY, v)
    window.dispatchEvent(
      new StorageEvent('storage', { key: KEY, newValue: v, storageArea: localStorage })
    )
  } catch (e) {
  }
  apply(v)
}

onMounted(() => {
  let v = 'auto'
  try {
    v = localStorage.getItem(KEY) || 'auto'
  } catch (e) {}
  if (v !== 'light' && v !== 'dark') v = 'auto'
  mode.value = v
  apply(v)

  mq = window.matchMedia('(prefers-color-scheme: dark)')
  onSystemChange = () => {
    if (mode.value === 'auto') apply('auto')
  }
  mq.addEventListener('change', onSystemChange)
})

onUnmounted(() => {
  if (mq && onSystemChange) mq.removeEventListener('change', onSystemChange)
})
</script>

<template>
  <div class="theme-switch" role="group" aria-label="配色テーマ">
    <button
      type="button"
      :class="{ on: mode === 'light' }"
      :aria-pressed="mode === 'light'"
      title="ライトモード"
      aria-label="ライトモード"
      @click="set('light')"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="4.2" />
        <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4" />
      </svg>
    </button>

    <button
      type="button"
      :class="{ on: mode === 'auto' }"
      :aria-pressed="mode === 'auto'"
      title="端末の設定に合わせる"
      aria-label="端末の設定に合わせる"
      @click="set('auto')"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="4.5" width="18" height="12.5" rx="1.8" />
        <path d="M9 20.5h6" />
      </svg>
    </button>

    <button
      type="button"
      :class="{ on: mode === 'dark' }"
      :aria-pressed="mode === 'dark'"
      title="ダークモード"
      aria-label="ダークモード"
      @click="set('dark')"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20 14.2A8.2 8.2 0 1 1 9.8 4a6.6 6.6 0 0 0 10.2 10.2z" />
      </svg>
    </button>
  </div>
</template>
