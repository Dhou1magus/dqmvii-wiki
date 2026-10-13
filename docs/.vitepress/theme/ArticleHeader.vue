<script setup lang="ts">
import { computed } from 'vue'
import { useData, withBase } from 'vitepress'
import { articleCategory } from './article-category'

const { page, frontmatter } = useData()
const category = computed(() => articleCategory(page.value.relativePath))
</script>

<template>
  <header v-if="!frontmatter.top && !page.isNotFound" class="article-header">
    <nav class="article-breadcrumb" aria-label="ページの位置">
      <a :href="withBase('/')">トップページ</a>
      <span aria-hidden="true">/</span>
      <a :href="withBase(category.link)">{{ category.title }}</a>
    </nav>
  </header>
</template>
