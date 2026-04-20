import { createPinia } from 'pinia';
import { createApp } from 'vue';
import './style.scss';
import MateChat from '@matechat/core';
import VueDevui from 'vue-devui';
import App from './App.vue';
import i18n from './i18n';
import router from './router';
import '@devui-design/icons/icomoon/devui-icon.css'
import VNetworkGraph from 'v-network-graph'
import 'v-network-graph/lib/style.css'

const pinia = createPinia();
const app = createApp(App);

app.use(pinia);
app.use(MateChat);
app.use(VueDevui);
app.use(i18n);
app.use(router);  // 确保在 mount 前使用 router
app.use(VNetworkGraph) 

app.mount('#app');  // 最后挂载
