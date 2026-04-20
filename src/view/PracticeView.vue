<template>
  <div class="practice-container">
    <div class="side-panel">
      <div class="panel-section">
        <h3>📋 任务要求</h3>
        <div class="task-box">
          <p class="description">{{ currentTask.description }}</p>
          <div v-for="req in currentTask.requirements" :key="req" class="task-req">
            <span class="check-icon">✓</span> {{ req }}
          </div>
        </div>
      </div>

      <div class="panel-section">
        <h3>🤖 AI 教练</h3>
        <div class="ai-tip">
          <div class="ai-header">
            <span class="bot-icon">🤖</span>
            <strong>AI 指导员</strong>
          </div>
          <p :class="{ 'typing': isTyping }">{{ aiTip }}</p>
          <button @click="handleAiConsult" class="tip-btn" :disabled="isTyping">
            {{ isTyping ? '思考中...' : '向教练请教' }}
          </button>
        </div>
      </div>

      <div class="action-area">
        <button @click="verifyTopology" class="verify-btn">验证拓扑</button>
        <div v-if="verified" class="verify-result" :class="{ 'success': verifyPassed }">
          {{ verifyMessage }}
        </div>
      </div>
    </div>

    <div class="main-content">
      <div class="toolbar">
        <div class="device-group">
          <span class="group-label">添加设备:</span>
          <button 
            v-for="device in deviceTypes" 
            :key="device.type"
            @click="addDevice(device.type)"
            class="add-btn"
          >
            {{ device.icon }} {{ device.name }}
          </button>
        </div>

        <div class="divider"></div>

        <div class="tool-group">
          <button 
            @click="toggleConnectMode" 
            :class="{ active: connectMode }"
            class="connect-btn"
          >
            🔗 {{ connectMode ? '取消连线' : '连线模式' }}
          </button>
          <button @click="resetCanvas" class="reset-btn">↺ 重置画布</button>
        </div>
      </div>

      <div class="graph-container">
        <v-network-graph
          ref="graphRef"
          v-model:selected-nodes="selectedNodes"
          :nodes="nodes"
          :edges="edges"
          :configs="configs"
          class="graph-canvas"
        />
        <div v-if="connectMode" class="floating-tip">
          请依次点击两个设备进行连接...
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { watch } from 'vue'

// 监听画布上的放置事件
const graphRef = ref(null)


// 连线模式状态
const connectMode = ref(false)
const selectedNode = ref(null)  // 当前选中的第一个节点

watch(connectMode, (val) => {
  configs.view.panEnabled = !val
})


// 切换连线模式
const toggleConnectMode = () => {
  console.log("连线模式")
  connectMode.value = !connectMode.value;
  if (!connectMode.value) {
    // 退出连线模式时清空所有节点的选中状态
    selectedNode.value = null;
  }
};


// 1. 定义选中节点数组
const selectedNodes = ref([])

const connectionQueue = []; // 用来存两次点击的临时队列

watch(selectedNodes, (newVal) => {
  if (!connectMode.value || newVal.length === 0) return
  
  const lastSelected = newVal[newVal.length - 1]
  
  if (!connectionQueue.includes(lastSelected)) {
    connectionQueue.push(lastSelected)
    console.log("队列加入节点:", lastSelected)
  }

  if (connectionQueue.length === 2) {
    const [s, t] = connectionQueue
    const edgeId = `edge_${Date.now()}`
    edges.value[edgeId] = { source: s, target: t }
    
    console.log("连线完成！")
    
    // 彻底清空
    connectionQueue.length = 0
    selectedNodes.value = []
    connectMode.value = false
  }
})

// 设备配置表（唯一数据源）
const deviceConfig = {
  router: { name: '路由器', icon: '🖧', color: '#e74c3c' },
  switch: { name: '交换机', icon: '🔀', color: '#f39c12' },
  pc: { name: 'PC', icon: '💻', color: '#3498db' },
  server: { name: '服务器', icon: '🖥️', color: '#9b59b6' },
  firewall: { name: '防火墙', icon: '🛡️', color: '#2c3e50' },
}

// 生成左侧面板的设备列表（从 deviceConfig 派生）
const deviceTypes = Object.entries(deviceConfig).map(([type, cfg]) => ({
  type,
  name: cfg.name,
  icon: cfg.icon,
}))

// 节点数据
const nodes = ref({
  // 初始可以有一些默认节点，或留空
})

// 边数据
const edges = ref({})

// 配置项
const configs = reactive({
  view: {
    panEnabled: true,     // 必须事先声明，watch 才能生效！
    zoomEnabled: true,
    scalingObjects: true,
    minZoom: 0.1,
    maxZoom: 4,
    autoPanAndZoomOnLoad: 'fit-content',
  },
  node: {
    selectable: 2, // 👈 关键点：设置为数字 2，表示最多允许同时选中 2 个
    selectionPolicy: "multiple", // 👈 显式声明多选策略
    normal: {
      strokeColor: (node, nodeId) => {
        if (connectMode.value && selectedNode.value === nodeId) {
          return '#ffaa00'
        }
        return '#2c3e50'
      },
      strokeWidth: (node, nodeId) => {
        if (connectMode.value && selectedNode.value === nodeId) {
          return 4
        }
        return 2
      },
    },
    hover: {
      color: (node) => {
        if (!node.color) return '#6aa9ff'
        return node.color.replace(/[\da-f]{2}/g, (c) => {
          const v = Math.min(parseInt(c, 16) + 30, 255).toString(16).padStart(2, '0')
          return v
        })
      },
    },
    draggable: (node) => {
       return !connectMode.value
    }
  },
  edge: {
    normal: {
      width: 2,
      color: '#95a5a6',
    },
    selected: {
      width: 3,
      color: '#e67e22',
      animated: true,
    },
  },
})



// 拖拽处理
const onDragStart = (event, device) => {
  // 保存设备类型到拖拽数据
  event.dataTransfer.setData('text/plain', JSON.stringify({
    type: 'add-node',
    deviceType: device.type
  }))
  event.dataTransfer.effectAllowed = 'copy'
}


// 在画布上放置设备
const onCanvasDrop = (event) => {
  event.preventDefault()
  const container = event.currentTarget
  const rect = container.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top

  try {
    const data = JSON.parse(event.dataTransfer.getData('text/plain'))
    if (data.type === 'add-node') {
      const deviceType = data.deviceType
      const cfg = deviceConfig[deviceType]
      if (!cfg) return

      const nodeId = `${deviceType}_${Date.now()}`
      nodes.value[nodeId] = {
        name: `${cfg.name}${Object.keys(nodes.value).length + 1}`,
        x, y,
        color: cfg.color,
        icon: cfg.icon,
      }
    }
  } catch (e) {
    console.warn('Invalid drop data', e)
  }
}

// 阻止画布默认拖拽行为
const onCanvasDragOver = (event) => {
  event.preventDefault()
}

// 节点拖拽事件
const onNodeDragStart = (nodeId) => {
  console.log('开始拖拽节点:', nodeId)
}

const onNodeDragEnd = (nodeId, x, y) => {
  console.log('节点拖拽结束:', nodeId, x, y)
  // 可以在这里保存节点位置
}

/// 统一添加设备函数 (优化序号逻辑)
const addDevice = (type) => {
  const cfg = deviceConfig[type]
  if (!cfg) return

  // 1. 核心改进：过滤出当前 nodes 中属于同一种类型的设备数量
  const sameTypeCount = Object.values(nodes.value).filter(node => {
    // 假设我们通过 nodeId 的前缀或 icon 来判断类型
    // 这里最准的方法是对比节点的 icon 或者在节点数据里存一个 type
    return node.type === type 
  }).length

  const nodeId = `${type}_${Date.now()}`
  
  nodes.value[nodeId] = {
    type: type, // 建议存一下类型，方便后续验证和计数
    name: `${cfg.name}${sameTypeCount + 1}`, // 独立计数：类别名 + 该类数量
    x: 200 + Math.random() * 200,
    y: 150 + Math.random() * 200,
    color: cfg.color,
    icon: cfg.icon,
  }
}


const resetCanvas = () => {
  nodes.value = {}
  edges.value = {}
  verified.value = false
}

// 验证功能（后续对接WNSWE）
const verified = ref(false)
const verifyPassed = ref(false)
const verifyMessage = ref('')

const verifyTopology = () => {
  const nodeArray = Object.values(nodes.value);
  const edgeArray = Object.values(edges.value);
  const errors = [];

  // --- 第一步：设备数量检查 ---
  taskRules.requiredDevices.forEach(rule => {
    const count = nodeArray.filter(n => n.type === rule.type).length;
    if (count < rule.min) {
      errors.push(`❌ 设备不足：${rule.label}`);
    }
  });

  // --- 第二步：连线逻辑检查 ---
  taskRules.requiredConnections.forEach(rule => {
    // 统计符合规则的连线数量
    let validConnCount = 0;
    
    // 这里的逻辑：只要连线的两端符合规则中的类型组合（不分先后）
    edgeArray.forEach(edge => {
      const sourceNode = nodes.value[edge.source];
      const targetNode = nodes.value[edge.target];
      if (!sourceNode || !targetNode) return;

      const types = [sourceNode.type, targetNode.type];
      if (types.includes(rule.from) && types.includes(rule.to)) {
        validConnCount++;
      }
    });

    if (validConnCount < rule.count) {
      errors.push(`❌ 连线错误：${rule.label} (当前有效连接: ${validConnCount})`);
    }
  });

  // --- 第三步：孤岛检查（可选：检查是否有设备没连线） ---
  const nodesWithEdges = new Set();
  edgeArray.forEach(e => {
    nodesWithEdges.add(e.source);
    nodesWithEdges.add(e.target);
  });
  if (nodeArray.length > 0 && nodesWithEdges.size < nodeArray.length) {
    errors.push('⚠️ 警告：画布上存在未连线的孤岛设备');
  }

  // --- 结果反馈 ---
  verified.value = true;
  if (errors.length === 0) {
    verifyPassed.value = true;
    verifyMessage.value = '🎉 完美！拓扑结构符合设计规范。';
    aiTip.value = '太棒了！你的物理链路搭建非常标准。下一步可以尝试配置单臂路由。';
  } else {
    verifyPassed.value = false;
    // 只显示第一条最紧迫的错误，防止打击学生信心
    verifyMessage.value = errors[0]; 
    aiTip.value = `排错建议：${errors[0].replace('❌ ', '')}`;
  }
};

// AI提示功能（后续对接对话API）
const aiTip = ref('考虑使用VLAN实现部门隔离，每个部门分配不同的VLAN ID。')
// 1. AI 的知识库：根据不同阶段给出建议
const aiKnowledgeBase = {
  initial: "欢迎！首先，请从上方工具栏添加一台路由器、一台交换机和两台 PC。",
  missingDevice: (name) => `我发现你还没添加 ${name}，这是构建网络的基础拓扑。`,
  missingConnection: "物理设备已经就绪，现在请切换到‘连线模式’，将 PC 连接到交换机，再将交换机连接到路由器。",
  readyToVerify: "看起来物理链路已经搭建好了！点击‘验证拓扑’看看是否符合规范。",
  advanced: [
    "提示：在真实场景中，交换机连接 PC 的端口通常配置为 Access 模式。",
    "提示：路由器与交换机之间的链路如果承载多个 VLAN，需要配置为 Trunk 模式。",
    "提示：别忘了给 PC 配置网关，网关地址通常是路由器的子接口地址。"
  ]
};

// 2. 动态分析当前状态并给出提示
const getNextTip = () => {
  const nodeArray = Object.values(nodes.value);
  const edgeArray = Object.values(edges.value);

  // 状态 1: 设备不足
  if (nodeArray.length < 4) {
    aiTip.value = aiKnowledgeBase.initial;
    return;
  }

  // 状态 2: 缺少特定类型
  const types = nodeArray.map(n => n.type);
  if (!types.includes('router')) {
    aiTip.value = aiKnowledgeBase.missingDevice('路由器');
    return;
  }

  // 状态 3: 没连线
  if (edgeArray.length === 0) {
    aiTip.value = aiKnowledgeBase.missingConnection;
    return;
  }

  // 状态 4: 基本完成，给出进阶知识 (循环切换)
  const randomIndex = Math.floor(Math.random() * aiKnowledgeBase.advanced.length);
  aiTip.value = aiKnowledgeBase.advanced[randomIndex];
};

const isTyping = ref(false);

const handleAiConsult = () => {
  isTyping.value = true;
  // 模拟 AI 思考的延迟感
  setTimeout(() => {
    getNextTip();
    isTyping.value = false;
  }, 600);
};

// 任务数据
const currentTask = ref({
  description: '为一家小型公司设计网络，要求：',
  requirements: [
    '2个部门（财务部、行政部）网络隔离',
    '各部门内部互通',
    '可以访问互联网'
  ]
})

// 模拟当前任务的“满分答案”逻辑
const taskRules = {
  requiredDevices: [
    { type: 'router', min: 1, label: '至少1台路由器' },
    { type: 'switch', min: 1, label: '至少1台交换机' },
    { type: 'pc', min: 2, label: '至少2台PC' }
  ],
  requiredConnections: [
    { from: 'pc', to: 'switch', count: 2, label: '两台PC都必须连接到交换机' },
    { from: 'switch', to: 'router', count: 1, label: '交换机必须上联至路由器' }
  ]
};

const myLog = (msg, data) => {
  window.console.log(msg, data)
}

</script>

<style scoped>
.practice-container {
  display: flex;
  height: 100vh;
  width: 100vw;
  background-color: #f5f7f9;
  overflow: hidden;
}

/* 左侧面板 */
.side-panel {
  width: 300px;
  background: white;
  border-right: 1px solid #dcdfe6;
  display: flex;
  flex-direction: column;
  padding: 20px;
  box-shadow: 2px 0 8px rgba(0,0,0,0.05);
}

.panel-section {
  margin-bottom: 30px;
}

.panel-section h3 {
  font-size: 16px;
  color: #2c3e50;
  margin-bottom: 12px;
  border-left: 4px solid #3498db;
  padding-left: 10px;
}

/* 右侧主区 */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
}

/* 顶部工具栏 */
.toolbar {
  height: 60px;
  background: white;
  border-bottom: 1px solid #dcdfe6;
  display: flex;
  align-items: center;
  padding: 0 20px;
  gap: 15px;
}

.device-group, .tool-group {
  display: flex;
  gap: 8px;
  align-items: center;
}

.group-label {
  font-size: 13px;
  color: #909399;
  margin-right: 5px;
}

.divider {
  width: 1px;
  height: 24px;
  background: #dcdfe6;
  margin: 0 10px;
}

/* 按钮样式优化 */
button {
  padding: 6px 12px;
  border-radius: 4px;
  border: 1px solid #dcdfe6;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
}

button:hover {
  background: #f0f7ff;
  border-color: #3498db;
}

.connect-btn.active {
  background: #e67e22;
  color: white;
  border-color: #d35400;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(230, 126, 34, 0.4); }
  70% { box-shadow: 0 0 0 10px rgba(230, 126, 34, 0); }
  100% { box-shadow: 0 0 0 0 rgba(230, 126, 34, 0); }
}

.graph-container {
  flex: 1;
  position: relative;
  background: #fafafa;
}

.floating-tip {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 8px 20px;
  border-radius: 20px;
  pointer-events: none;
  font-size: 14px;
}

.verify-btn {
  width: 100%;
  padding: 12px;
  background: #3498db;
  color: white;
  font-weight: bold;
}

/* 验证结果弹窗样式 */
.verify-result {
  margin-top: 15px;
  padding: 12px;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.5;
  animation: slideIn 0.3s ease-out;
}

.verify-result.success {
  background-color: #f0f9eb;
  color: #67c23a;
  border: 1px solid #c2e7b0;
}

.verify-result:not(.success) {
  background-color: #fef0f0;
  color: #f56c6c;
  border: 1px solid #fbc4c4;
}

@keyframes slideIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>