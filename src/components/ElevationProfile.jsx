import React, { useEffect, useRef } from 'react';
import { Modal, Empty, Button, Space } from 'antd';
import {
  CloseOutlined,
  DeleteOutlined,
  RiseOutlined,
  FallOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined
} from '@ant-design/icons';
import * as echarts from 'echarts';
import { useAppStore } from '../stores/useAppStore';

/** 计算剖面统计数据 */
const calcStats = (data) => {
  if (!data || data.length === 0) return null;

  const elevations = data.map(d => d.elevation);
  const minElevation = Math.min(...elevations);
  const maxElevation = Math.max(...elevations);
  const totalDistance = data[data.length - 1].distance;

  // 累计爬升和下降
  let elevationGain = 0;
  let elevationLoss = 0;
  for (let i = 1; i < data.length; i++) {
    const diff = data[i].elevation - data[i - 1].elevation;
    if (diff > 0) elevationGain += diff;
    else elevationLoss += Math.abs(diff);
  }

  return {
    totalDistance,
    minElevation,
    maxElevation,
    elevationGain,
    elevationLoss,
    elevationDiff: maxElevation - minElevation,
    avgGradient: totalDistance > 0 ? (elevationGain / totalDistance * 100) : 0
  };
};

/** 统计卡片子组件 */
const StatCard = ({ icon, label, value, color }) => (
  <div style={{
    padding: '10px 12px',
    background: '#fafafa',
    borderRadius: 8,
    textAlign: 'center',
    border: '1px solid #f0f0f0'
  }}>
    <div style={{ color, fontSize: 16, marginBottom: 4 }}>{icon}</div>
    <div style={{ fontSize: 11, color: '#999' }}>{label}</div>
    <div style={{ fontSize: 15, fontWeight: 700, color: '#333', marginTop: 2 }}>{value}</div>
  </div>
);

const ElevationProfile = () => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  const {
    profileData,
    profileModalVisible,
    setProfileModalVisible,
    clearProfileAnchors,
    setAnalysisMode,
    setProfileData
  } = useAppStore();

  // 关闭弹窗，清理所有剖面相关状态
  const handleClose = () => {
    setProfileModalVisible(false);
    clearProfileAnchors();
    setAnalysisMode('none');
    setProfileData(null);
  };

  // 重新进入剖面模式（再画一条）
  const handleDrawAgain = () => {
    setProfileModalVisible(false);
    clearProfileAnchors();
    // 保持 analysisMode 为 'profile'，让用户可以继续画线
  };

  // 渲染 ECharts（用 setTimeout 确保 Modal DOM 已挂载）
  useEffect(() => {
    if (!profileModalVisible || !profileData || profileData.length === 0) return;

    // 销毁旧实例
    if (chartInstance.current) {
      chartInstance.current.dispose();
      chartInstance.current = null;
    }

    // 延迟到下一帧，确保 Modal 内 div 已渲染
    const timer = setTimeout(() => {
      if (!chartRef.current) {
        console.warn('chartRef 未就绪');
        return;
      }

      const chart = echarts.init(chartRef.current);
      chartInstance.current = chart;

      const distances = profileData.map(d => (d.distance / 1000).toFixed(2));
      const elevations = profileData.map(d => d.elevation.toFixed(1));
      const stats = calcStats(profileData);

      const option = {
        backgroundColor: '#1a1a2e',
        title: {
          text: '地形高程剖面图',
          subtext: stats ? `总长 ${(stats.totalDistance / 1000).toFixed(2)} km  |  高差 ${stats.elevationDiff.toFixed(0)} m` : '',
          left: 'center',
          textStyle: { color: '#e0e0e0', fontSize: 16 },
          subtextStyle: { color: '#aaa', fontSize: 12 }
        },
        tooltip: {
          trigger: 'axis',
          formatter: (params) => {
            const p = params[0];
            return `<div style="font-size:13px"><div>📏 距离: <b>${p.axisValue} km</b></div><div>⛰ 高程: <b>${p.data} m</b></div></div>`;
          }
        },
        grid: { left: 60, right: 30, top: 70, bottom: 50 },
        xAxis: {
          type: 'category',
          data: distances,
          name: '距离 (km)',
          nameLocation: 'center',
          nameGap: 35,
          nameTextStyle: { color: '#aaa', fontSize: 12 },
          axisLabel: { color: '#ccc', fontSize: 10 },
          axisLine: { lineStyle: { color: '#555' } },
          splitLine: { show: false }
        },
        yAxis: {
          type: 'value',
          name: '高程 (m)',
          nameTextStyle: { color: '#aaa', fontSize: 12 },
          axisLabel: { color: '#ccc', fontSize: 10 },
          axisLine: { lineStyle: { color: '#555' } },
          splitLine: { lineStyle: { color: '#333', type: 'dashed' } },
          min: stats ? Math.floor(stats.minElevation / 50) * 50 - 50 : undefined,
          max: stats ? Math.ceil(stats.maxElevation / 50) * 50 + 50 : undefined
        },
        series: [
          {
            type: 'line', data: elevations, smooth: 0.3, symbol: 'none',
            lineStyle: { width: 0, color: 'transparent' },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'rgba(64, 169, 255, 0.5)' },
                { offset: 1, color: 'rgba(64, 169, 255, 0.05)' }
              ])
            }
          },
          {
            type: 'line', data: elevations, smooth: 0.3, symbol: 'none',
            lineStyle: { color: '#40a9ff', width: 2.5 },
            markPoint: stats ? {
              data: [
                { type: 'max', name: '最高点', symbol: 'pin', symbolSize: 40, itemStyle: { color: '#ff4d4f' }, label: { color: '#fff', fontSize: 11 } },
                { type: 'min', name: '最低点', symbol: 'pin', symbolSize: 35, itemStyle: { color: '#52c41a' }, label: { color: '#fff', fontSize: 11 } }
              ]
            } : undefined,
            markLine: stats ? {
              silent: true, symbol: 'none', lineStyle: { color: '#666', type: 'dashed' },
              data: [
                { yAxis: stats.minElevation, label: { formatter: `最低 ${stats.minElevation.toFixed(0)}m`, color: '#52c41a', fontSize: 11 } },
                { yAxis: stats.maxElevation, label: { formatter: `最高 ${stats.maxElevation.toFixed(0)}m`, color: '#ff4d4f', fontSize: 11 } }
              ]
            } : undefined
          }
        ],
        dataZoom: [{
          type: 'slider', start: 0, end: 100, height: 25, bottom: 8,
          borderColor: '#444', backgroundColor: '#222',
          fillerColor: 'rgba(64, 169, 255, 0.2)', textStyle: { color: '#aaa' }
        }]
      };

      chart.setOption(option);

      const handleResize = () => chart.resize();
      window.addEventListener('resize', handleResize);

      // 保存清理函数引用
      chartInstance.current = chart;
      chart.__resizeHandler = handleResize;
    }, 100);

    return () => {
      clearTimeout(timer);
      if (chartInstance.current) {
        const handler = chartInstance.current.__resizeHandler;
        if (handler) window.removeEventListener('resize', handler);
        chartInstance.current.dispose();
        chartInstance.current = null;
      }
    };
  }, [profileModalVisible, profileData]);

  const stats = profileData ? calcStats(profileData) : null;

  return (
    <Modal
      title={
        <Space>
          <RiseOutlined style={{ color: '#40a9ff' }} />
          <span>地形高程剖面分析</span>
        </Space>
      }
      open={profileModalVisible}
      onCancel={handleClose}
      footer={[
        <Button key="drawAgain" icon={<RiseOutlined />} onClick={handleDrawAgain}>
          重新画线
        </Button>,
        <Button key="clear" icon={<DeleteOutlined />} onClick={handleClose}>
          关闭剖面
        </Button>
      ]}
      width={900}
      destroyOnClose
    >
      {profileData && profileData.length > 0 ? (
        <>
          {/* 统计信息卡片 */}
          {stats && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(6, 1fr)',
              gap: 8,
              marginBottom: 16
            }}>
              <StatCard icon={<RiseOutlined />} label="总长度" value={`${(stats.totalDistance / 1000).toFixed(2)} km`} color="#40a9ff" />
              <StatCard icon={<ArrowUpOutlined />} label="最高点" value={`${stats.maxElevation.toFixed(0)} m`} color="#ff4d4f" />
              <StatCard icon={<ArrowDownOutlined />} label="最低点" value={`${stats.minElevation.toFixed(0)} m`} color="#52c41a" />
              <StatCard icon={<RiseOutlined />} label="总高差" value={`${stats.elevationDiff.toFixed(0)} m`} color="#faad14" />
              <StatCard icon={<RiseOutlined />} label="累计爬升" value={`${stats.elevationGain.toFixed(0)} m`} color="#ff7a45" />
              <StatCard icon={<FallOutlined />} label="平均坡度" value={`${stats.avgGradient.toFixed(1)}%`} color="#597ef7" />
            </div>
          )}

          {/* ECharts 图表 */}
          <div
            ref={chartRef}
            style={{
              width: '100%',
              height: 350,
              borderRadius: 8,
              overflow: 'hidden'
            }}
          />
        </>
      ) : (
        <Empty description="暂无剖面数据，请在地图上点击设置剖面线" />
      )}
    </Modal>
  );
};

export default ElevationProfile;
