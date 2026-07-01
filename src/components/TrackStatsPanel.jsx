/**
 * TrackStatsPanel.jsx — GPS轨迹统计面板
 *
 * 浮在3D地图左下角，展示当前选中轨迹的统计数据。
 * 核心计算逻辑全部在 trackAnalytics.js 中（纯函数，方便讲解）。
 * 本组件只负责：读取store → 调用计算函数 → 渲染DOM。
 */

import React, { useMemo } from 'react';
import { useAppStore } from '../stores/useAppStore';
import { computeTrackStats, computeAllTrackStats, formatDistance, formatDuration } from '../utils/trackAnalytics';

// ==================== 样式常量 ====================
const PANEL_STYLE = {
  position: 'absolute',
  bottom: 16,
  left: 16,
  zIndex: 998,
  minWidth: 220,
  maxWidth: 280,
  background: 'rgba(22, 27, 34, 0.94)',
  border: '1px solid #30363d',
  borderRadius: 8,
  padding: '14px 16px',
  color: '#e6edf3',
  fontFamily: '-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif',
  boxShadow: '0 2px 12px rgba(0,0,0,0.5)',
  backdropFilter: 'blur(8px)',
  cursor: 'default',
  userSelect: 'none',
};

const TITLE_STYLE = {
  fontSize: 13,
  fontWeight: 600,
  marginBottom: 10,
  color: '#58a6ff',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
};

const ROW_STYLE = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '3px 0',
  fontSize: 12,
  borderBottom: '1px solid rgba(48, 54, 61, 0.4)',
};

const LABEL_STYLE = {
  color: '#8b949e',
  fontSize: 11,
};

const VALUE_STYLE = {
  color: '#e6edf3',
  fontWeight: 500,
  fontSize: 12,
  fontVariantNumeric: 'tabular-nums',
};

// ==================== 子组件 ====================
const StatRow = ({ label, value, valueColor }) => (
  <div style={ROW_STYLE}>
    <span style={LABEL_STYLE}>{label}</span>
    <span style={{ ...VALUE_STYLE, color: valueColor || VALUE_STYLE.color }}>{value}</span>
  </div>
);

// ==================== 组件 ====================
const TrackStatsPanel = () => {
  const tracks = useAppStore(s => s.tracks);
  const selectedTrackId = useAppStore(s => s.selectedTrackId);

  // 用 useMemo 缓存计算结果（数据不变就不重算）
  const statsList = useMemo(() => {
    const visibleTracks = tracks.filter(t => t.visible && t.points.length > 0);
    if (visibleTracks.length === 0) return [];
    return computeAllTrackStats(visibleTracks);
  }, [tracks]);

  // 找到当前选中的轨迹统计
  const selectedStats = useMemo(() => {
    if (!selectedTrackId) return null;
    const track = tracks.find(t => t.id === selectedTrackId);
    if (!track || track.points.length === 0) return null;
    return computeTrackStats(track);
  }, [tracks, selectedTrackId]);

  // 汇总所有可见轨迹
  const totalSummary = useMemo(() => {
    if (statsList.length === 0) return null;
    const totalDist = statsList.reduce((s, st) => s + st.totalDistance, 0);
    const totalGain = statsList.reduce((s, st) => s + st.elevationGain, 0);
    const totalPts = statsList.reduce((s, st) => s + st.pointCount, 0);
    return { totalDist, totalGain, totalPts };
  }, [statsList]);

  // ---- 无数据 ----
  if (statsList.length === 0) {
    return (
      <div style={PANEL_STYLE}>
        <div style={TITLE_STYLE}>📊 轨迹统计</div>
        <div style={{ fontSize: 12, color: '#6e7681' }}>暂无轨迹数据</div>
      </div>
    );
  }

  // ---- 显示单条轨迹详情 ----
  if (selectedStats) {
    const s = selectedStats;
    return (
      <div style={PANEL_STYLE}>
        <div style={TITLE_STYLE}>📊 轨迹统计</div>
        <div style={{ fontSize: 12, color: '#e6edf3', marginBottom: 8, fontWeight: 600 }}>
          {s.name}
        </div>
        <StatRow label="总里程" value={formatDistance(s.totalDistance)} />
        <StatRow label="轨迹点数" value={s.pointCount + ' 个'} />
        {s.validElevationCount > 0 && (
          <>
            <StatRow label="累计爬升" value={s.elevationGain.toFixed(0) + ' m'} valueColor="#3fb950" />
            <StatRow label="累计下降" value={s.elevationLoss.toFixed(0) + ' m'} valueColor="#f85149" />
            <StatRow label="最高点" value={s.maxElevation.toFixed(0) + ' m'} />
            <StatRow label="最低点" value={s.minElevation.toFixed(0) + ' m'} />
          </>
        )}
        {s.avgSpeed !== null && (
          <>
            <StatRow label="平均速度" value={s.avgSpeed.toFixed(1) + ' km/h'} />
            <StatRow label="总耗时" value={formatDuration(s.totalDuration)} />
          </>
        )}
        <div style={{ marginTop: 6, fontSize: 10, color: '#484f58' }}>
          点击轨迹切换查看 · 共 {statsList.length} 条轨迹
        </div>
      </div>
    );
  }

  // ---- 多条轨迹汇总 ----
  return (
    <div style={PANEL_STYLE}>
      <div style={TITLE_STYLE}>📊 轨迹统计</div>
      <div style={{ fontSize: 12, color: '#8b949e', marginBottom: 8 }}>
        {statsList.length} 条轨迹
      </div>
      {totalSummary && (
        <>
          <StatRow label="合计里程" value={formatDistance(totalSummary.totalDist)} />
          <StatRow label="合计爬升" value={totalSummary.totalGain.toFixed(0) + ' m'} valueColor="#3fb950" />
          <StatRow label="合计点数" value={totalSummary.totalPts + ' 个'} />
        </>
      )}
      {/* 每条轨迹简短一行 */}
      {statsList.map((s, i) => (
        <div key={i} style={{ ...ROW_STYLE, borderBottom: 'none', padding: '1px 0' }}>
          <span style={{ ...LABEL_STYLE, maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {s.name}
          </span>
          <span style={{ ...VALUE_STYLE, fontSize: 11 }}>{formatDistance(s.totalDistance)}</span>
        </div>
      ))}
      <div style={{ marginTop: 6, fontSize: 10, color: '#484f58' }}>
        点击轨迹查看详细统计
      </div>
    </div>
  );
};

export default TrackStatsPanel;
