// server/server.js
import express from 'express'
import cors from 'cors'
import fetch from 'node-fetch'

const app = express()
app.use(cors())
app.use(express.json())

// 这里以 DeepSeek 为例（免费，注册送额度）
// 注册地址：https://platform.deepseek.com/
const DEEPSEEK_API_KEY = 'sk-5bbf4331c84340c1ac1a8865f9105377'.trim()  // 替换为你的密钥

app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body
    
    // 设置流式响应头
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    
    // 调用 DeepSeek API
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: '你是一位中职网络基础课程的教练，用通俗易懂的语言解释网络概念。' },
          { role: 'user', content: message }
        ],
        stream: true  // 启用流式
      })
    })
    
    // 将 DeepSeek 的流式响应直接转发给前端
    response.body.pipe(res)
    
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000')
})