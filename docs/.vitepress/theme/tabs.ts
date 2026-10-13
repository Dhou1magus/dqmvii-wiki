import { refreshStickyColumns } from './sortable-tables'

function select(tabs: HTMLButtonElement[], panels: HTMLElement[], index: number, focus: boolean): void {
  tabs.forEach((tab, i) => {
    const on = i === index
    tab.setAttribute('aria-selected', on ? 'true' : 'false')
    tab.tabIndex = on ? 0 : -1
    panels[i].hidden = !on
  })
  if (focus) tabs[index].focus()
  refreshStickyColumns()
}

export function setupTabs(): void {
  for (const group of document.querySelectorAll<HTMLElement>('.vp-doc .dq-tabs')) {
    if (group.dataset.tabsReady === 'yes') continue
    group.dataset.tabsReady = 'yes'

    const tabs = [...group.querySelectorAll<HTMLButtonElement>(':scope > .dq-tab-list > [role="tab"]')]
    const panels = [...group.querySelectorAll<HTMLElement>(':scope > .dq-tab-panel')]
    if (!tabs.length || tabs.length !== panels.length) continue

    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => select(tabs, panels, i, false))
      tab.addEventListener('keydown', (event) => {
        const last = tabs.length - 1
        const next =
          event.key === 'ArrowRight' ? (i === last ? 0 : i + 1)
          : event.key === 'ArrowLeft' ? (i === 0 ? last : i - 1)
          : event.key === 'Home' ? 0
          : event.key === 'End' ? last
          : -1
        if (next < 0) return
        event.preventDefault()
        select(tabs, panels, next, true)
      })
    })
  }
}
