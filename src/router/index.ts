import { createRouter, createWebHistory } from 'vue-router'
// 确保路径正确，您的视图文件在 view 文件夹
import ChatView from '../view/ChatView.vue'
import PracticeView from '../view/PracticeView.vue'

const routes = [
  { path: '/', redirect: '/chat' },  // 默认跳转到聊天页
  { path: '/chat', component: ChatView },
  { path: '/practice', component: PracticeView }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router