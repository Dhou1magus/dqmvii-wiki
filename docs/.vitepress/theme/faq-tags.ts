export function markFaqTags(): void {
  for (const p of document.querySelectorAll<HTMLParagraphElement>('.vp-doc p')) {
    if (p.dataset.tags === 'ready') continue
    const text = p.textContent?.trim() ?? ''
    if (!/^タグ[:：]/.test(text)) continue
    p.dataset.tags = 'ready'
    p.classList.add('faq-tags')
    const words = text.replace(/^タグ[:：]\s*/, '').split(/[・、]/).map((w) => w.trim()).filter(Boolean)
    p.textContent = ''
    const label = document.createElement('span')
    label.className = 'lbl'
    label.textContent = 'タグ'
    p.appendChild(label)
    for (const w of words) {
      const chip = document.createElement('span')
      chip.className = 'chip'
      chip.textContent = w
      p.appendChild(chip)
    }
  }
}
