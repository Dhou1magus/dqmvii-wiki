<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

const visible = ref(false)
let frame = 0

function update() {
  cancelAnimationFrame(frame)
  frame = requestAnimationFrame(() => {
    visible.value = window.scrollY > Math.max(480, window.innerHeight * 0.9)
  })
}

function toTop() {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
  const target = document.getElementById('VPContent')
  if (!target) return
  if (!target.hasAttribute('tabindex')) {
    const release = () => {
      target.removeAttribute('tabindex')
      target.removeEventListener('blur', release)
    }
    target.setAttribute('tabindex', '-1')
    target.addEventListener('blur', release)
  }
  target.focus({ preventScroll: true })
}

onMounted(() => {
  update()
  window.addEventListener('scroll', update, { passive: true })
  window.addEventListener('resize', update)
})
onUnmounted(() => {
  cancelAnimationFrame(frame)
  window.removeEventListener('scroll', update)
  window.removeEventListener('resize', update)
})
</script>

<template>
  <button type="button" class="back-to-top" :class="{ visible }" aria-label="ページの先頭へ戻る" title="ページの先頭へ戻る" @click="toTop">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V6M6 11.5 12 5.5l6 6" /></svg>
  </button>
</template>
