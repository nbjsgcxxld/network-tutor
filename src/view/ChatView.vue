<template>
  <div class="chat-container">
    <!-- 消息列表区域 -->
    <div class="message-list" ref="messageListRef">
      <div 
        v-for="(msg, index) in messages" 
        :key="index" 
        :class="['message', msg.role]"
      >
        <div class="avatar">
          {{ msg.role === 'user' ? '👤' : '🤖' }}
        </div>
        <div class="bubble">
          <!-- 使用 v-html 渲染 Markdown（需先安装 marked） -->
          <div v-if="msg.role === 'assistant'" v-html="renderMarkdown(msg.content)"></div>
          <div v-else>{{ msg.content }}</div>
        </div>
      </div>
      
      <!-- AI正在输入的占位符 -->
      <div v-if="isLoading" class="message assistant">
        <div class="avatar">🤖</div>
        <div class="bubble typing">
          <span>.</span><span>.</span><span>.</span>
        </div>
      </div>
    </div>
    
    <!-- 快速问题卡片 -->
    <div class="suggestion-cards">
      <div 
        v-for="q in quickQuestions" 
        :key="q"
        class="card"
        @click="quickQuestion(q)"
      >
        {{ q }}
      </div>
    </div>
    
    <!-- 输入区域 -->
    <div class="input-area">
      <input 
        v-model="userInput" 
        @keyup.enter="sendMessage"
        placeholder="输入网络技术问题..."
        :disabled="isLoading"
      />
      <button @click="sendMessage" :disabled="isLoading || !userInput.trim()">
        发送
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, watch } from 'vue'
import { marked } from 'marked'  // 需要安装：npm install marked
import hljs from 'highlight.js'  // 需要安装：npm install highlight.js
import 'highlight.js/styles/github-dark.css'

// 配置 marked 支持代码高亮
marked.setOptions({
  highlight: (code, lang) => {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang }).value
    }
    return hljs.highlightAuto(code).value
  }
})

// 消息列表
const messages = ref([
  { role: 'assistant', content: '你好！我是你的网络基础教练。有什么网络问题需要帮助吗？' }
])

// 用户输入
const userInput = ref('')
const isLoading = ref(false)
const messageListRef = ref(null)

// 快速问题列表
const quickQuestions = [
  '什么是OSI七层模型？',
  '如何划分子网？',
  'VLAN有什么作用',
  '路由协议有哪些'
]

// 渲染 Markdown
const renderMarkdown = (content) => {
  return marked.parse(content)
}

// 发送消息
const sendMessage = async () => {
  if (!userInput.value.trim() || isLoading.value) return

  const question = userInput.value
  messages.value.push({ role: 'user', content: question })
  userInput.value = ''
  isLoading.value = true

  await nextTick()
  scrollToBottom()

  // 添加一个空白的AI消息用于流式填充
  messages.value.push({ role: 'assistant', content: '' })
  const aiMessageIndex = messages.value.length - 1

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: question, stream: true })
    })

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || '' // 保留最后一个可能不完整的行

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') continue

          try {
            const parsed = JSON.parse(data)
            const delta = parsed.choices[0]?.delta
            if (delta?.content) {
              messages.value[aiMessageIndex].content += delta.content
              scrollToBottom()
            }
          } catch (e) {
            console.error('JSON解析错误:', e, '行内容:', line)
          }
        }
      }
    }
  } catch (error) {
    console.error('请求失败:', error)
    messages.value[aiMessageIndex].content = '抱歉，我遇到了一些问题，请稍后再试。'
  } finally {
    isLoading.value = false
    scrollToBottom()
  }
}

// 快速问题点击
const quickQuestion = (q) => {
  userInput.value = q
  sendMessage()
}

// 滚动到底部
const scrollToBottom = () => {
  if (messageListRef.value) {
    messageListRef.value.scrollTop = messageListRef.value.scrollHeight
  }
}

// 监听消息变化，自动滚动
watch(messages, () => {
  nextTick(() => {
    scrollToBottom()
  })
}, { deep: true })
</script>

<style scoped>
.chat-container {
  height: calc(100vh - 60px);
  display: flex;
  flex-direction: column;
  background-color: #f5f7fa;
}

.message-list {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.message {
  display: flex;
  margin-bottom: 20px;
  gap: 12px;
}

.message.user {
  flex-direction: row-reverse;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #e9ecef;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.bubble {
  max-width: 70%;
  padding: 12px 16px;
  border-radius: 12px;
  background: white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  line-height: 1.5;
}

.message.user .bubble {
  background: #0052d9;
  color: white;
}

/* Markdown 样式 */
.bubble :deep(pre) {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 12px;
  border-radius: 8px;
  overflow-x: auto;
}

.bubble :deep(code) {
  font-family: 'Courier New', monospace;
}

.bubble :deep(p) {
  margin: 0 0 8px 0;
}

.bubble :deep(p:last-child) {
  margin-bottom: 0;
}

/* 打字机动画 */
.typing span {
  animation: blink 1.4s infinite;
  animation-fill-mode: both;
  font-size: 20px;
}

.typing span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes blink {
  0% { opacity: 0.2; }
  20% { opacity: 1; }
  100% { opacity: 0.2; }
}

.suggestion-cards {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: white;
  border-top: 1px solid #e9ecef;
  overflow-x: auto;
}

.card {
  padding: 8px 16px;
  background: #f0f4ff;
  border-radius: 20px;
  color: #0052d9;
  cursor: pointer;
  font-size: 14px;
  white-space: nowrap;
  transition: all 0.2s;
}

.card:hover {
  background: #0052d9;
  color: white;
}

.input-area {
  display: flex;
  padding: 16px;
  background: white;
  border-top: 1px solid #e9ecef;
  gap: 12px;
}

.input-area input {
  flex: 1;
  padding: 12px;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  font-size: 16px;
}

.input-area input:focus {
  outline: none;
  border-color: #0052d9;
}

.input-area button {
  padding: 12px 24px;
  background: #0052d9;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
}

.input-area button:disabled {
  background: #ccc;
  cursor: not-allowed;
}
</style>