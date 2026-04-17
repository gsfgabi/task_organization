import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'
import './assets/globals.css'
import router from './router'
import { useTimeEntriesStore } from './stores/time-entries'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

useTimeEntriesStore(pinia).resyncAllTasks()

app.mount('#app')

router.afterEach((to) => {
  const t = to.meta.title
  document.title = t ? `${t} · Task Org` : 'Task Org'
})
