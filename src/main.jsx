import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { buildModuleUrl } from 'cesium'

// 正确调用 buildModuleUrl 函数设置基础URL
buildModuleUrl('./')

// 设置Cesium全局配置以解决资源加载问题
if (typeof window !== 'undefined') {
  window.CESIUM_BASE_URL = 'http://162.105.17.34/cesium/'
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
