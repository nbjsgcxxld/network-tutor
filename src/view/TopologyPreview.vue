<template>
    <div class="topology-preview border rounded p-4 bg-gray-50">
      <p class="text-sm text-gray-600">拓扑预览区域</p>
      <!-- 这里后续可以集成 draw.io 或 ECharts 关系图 -->
      <pre v-if="data" class="text-xs mt-2">{{ JSON.stringify(data, null, 2) }}</pre>
    </div>
  </template>
  
  <script setup>
  defineProps({
    data: {
      type: Object,
      default: () => ({})
    }
  })
  </script>