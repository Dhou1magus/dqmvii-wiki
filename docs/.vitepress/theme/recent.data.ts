import { recentPages } from '../recent.mts'

export default {
  load() {
    return recentPages().slice(0, 6).map(({ title, url, date, iso }) => ({ title, url, date, iso }))
  }
}
