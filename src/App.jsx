import React from 'react';
import { Layout, ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import CesiumMap from './components/CesiumMap';
import Sidebar from './components/Sidebar';
import ElevationProfile from './components/ElevationProfile';
import OverviewMap from './components/OverviewMap';
import TrackStatsPanel from './components/TrackStatsPanel';
import { useAppStore } from './stores/useAppStore';

const { Sider, Content } = Layout;

const App = () => {
  const { sidebarCollapsed, setSidebarCollapsed } = useAppStore();

  return (
    <ConfigProvider locale={zhCN}>
      <Layout style={{ height: '100vh' }}>
        <Sider
          width={320}
          collapsed={sidebarCollapsed}
          onCollapse={setSidebarCollapsed}
          collapsible
          theme="light"
          style={{
            overflow: 'auto',
            height: '100vh',
            position: 'fixed',
            left: 0,
            top: 0,
            bottom: 0,
            zIndex: 1000,
            boxShadow: '2px 0 8px rgba(0, 0, 0, 0.1)'
          }}
        >
          <Sidebar />
        </Sider>

        <Layout style={{ marginLeft: sidebarCollapsed ? 80 : 320 }}>
          <Content style={{ margin: 0, padding: 0, overflow: 'hidden', position: 'relative' }}>
            <CesiumMap />
            <ElevationProfile />
            <OverviewMap />
            <TrackStatsPanel />
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
};

export default App;
