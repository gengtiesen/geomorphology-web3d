/**
 * OverviewMap.jsx — Canvas 2D 鹰眼图
 *
 * 功能：在3D地图右下角叠加一个小型Canvas，用纯2D绘制展示：
 *   1. 所有轨迹的俯视投影（彩色折线）
 *   2. 观察点位置（红色圆点）
 *   3. 当前3D相机视角范围（蓝色半透明矩形）
 *   4. 相机位置指示器
 *   5. 点击鹰眼图 → 3D相机飞到对应位置
 *
 * JS技能点：Canvas 2D API、坐标变换、Cesium相机联动、requestAnimationFrame节流
 */
import React, { useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '../stores/useAppStore';
import * as Cesium from 'cesium';

// ==================== 常量 ====================
const CANVAS_W = 200;
const CANVAS_H = 150;
const DEVICE_RATIO = window.devicePixelRatio || 1;
const PADDING = 0.12; // 数据范围外留白12%

// ==================== 颜色常量 ====================
const COLORS = {
  bg: '#0d1117',
  grid: '#1c2636',
  border: '#30363d',
  point: '#f85149',
  pointOutline: '#ffb3b3',
  cameraFov: 'rgba(88, 166, 255, 0.18)',
  cameraFovStroke: 'rgba(88, 166, 255, 0.7)',
  cameraPos: '#58a6ff',
  northArrow: '#8b949e',
};

// ==================== 组件 ====================
const OverviewMap = () => {
  const canvasRef = useRef(null);
  const animFrameRef = useRef(0);
  const dirtyRef = useRef(true);

  // 从 store 读取数据（仅取视图相关字段避免不必要重渲染）
  const tracks = useAppStore(s => s.tracks);
  const observationPoints = useAppStore(s => s.observationPoints);
  const cesiumViewer = useAppStore(s => s.cesiumViewer);

  // ==================== 核心绘制 ====================
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = CANVAS_W * DEVICE_RATIO;
    const H = CANVAS_H * DEVICE_RATIO;
    canvas.width = W;
    canvas.height = H;
    ctx.setTransform(DEVICE_RATIO, 0, 0, DEVICE_RATIO, 0, 0);

    // -- 1. 计算数据范围 --
    let minLon = Infinity, maxLon = -Infinity;
    let minLat = Infinity, maxLat = -Infinity;

    // 轨迹
    tracks.filter(t => t.visible).forEach(t => {
      t.points.forEach(p => {
        if (p.lng < minLon) minLon = p.lng;
        if (p.lng > maxLon) maxLon = p.lng;
        if (p.lat < minLat) minLat = p.lat;
        if (p.lat > maxLat) maxLat = p.lat;
      });
    });
    // 观察点
    observationPoints.forEach(p => {
      if (p.lng < minLon) minLon = p.lng;
      if (p.lng > maxLon) maxLon = p.lng;
      if (p.lat < minLat) minLat = p.lat;
      if (p.lat > maxLat) maxLat = p.lat;
    });

    // 无数据时退出
    if (!isFinite(minLon)) {
      ctx.fillStyle = COLORS.bg;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.fillStyle = '#8b949e';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('暂无数据', CANVAS_W / 2, CANVAS_H / 2);
      return;
    }

    // 确保有合理范围
    const spanLon = maxLon - minLon || 0.1;
    const spanLat = maxLat - minLat || 0.1;
    minLon -= spanLon * PADDING;
    maxLon += spanLon * PADDING;
    minLat -= spanLat * PADDING;
    maxLat += spanLat * PADDING;

    // 保持画面比例不变形（宽高比匹配Canvas）
    const canvasAspect = CANVAS_W / CANVAS_H;
    const dataAspect = (maxLon - minLon) / Math.max(maxLat - minLat, 0.01);
    if (dataAspect > canvasAspect) {
      const midLat = (minLat + maxLat) / 2;
      const halfH = (maxLon - minLon) / canvasAspect / 2;
      minLat = midLat - halfH;
      maxLat = midLat + halfH;
    } else {
      const midLon = (minLon + maxLon) / 2;
      const halfW = (maxLat - minLat) * canvasAspect / 2;
      minLon = midLon - halfW;
      maxLon = midLon + halfW;
    }

    // 坐标映射函数
    const toX = (lon) => ((lon - minLon) / (maxLon - minLon)) * CANVAS_W;
    const toY = (lat) => CANVAS_H - ((lat - minLat) / (maxLat - minLat)) * CANVAS_H; // Y轴翻转（北在上）

    // -- 2. 绘制背景 --
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // -- 3. 绘制参考网格 --
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 0.4;
    const lonStep = (maxLon - minLon) / 5;
    const latStep = (maxLat - minLat) / 4;
    for (let i = 1; i < 5; i++) {
      const x = toX(minLon + lonStep * i);
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_H); ctx.stroke();
    }
    for (let i = 1; i < 4; i++) {
      const y = toY(minLat + latStep * i);
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_W, y); ctx.stroke();
    }

    // -- 4. 绘制相机视域矩形（从Cesium相机获取） --
    if (cesiumViewer) {
      try {
        const rect = cesiumViewer.camera.computeViewRectangle();
        if (rect) {
          const west = Cesium.Math.toDegrees(rect.west);
          const south = Cesium.Math.toDegrees(rect.south);
          const east = Cesium.Math.toDegrees(rect.east);
          const north = Cesium.Math.toDegrees(rect.north);

          const rx = toX(west), ry = toY(north);
          const rw = toX(east) - rx, rh = toY(south) - ry;

          ctx.fillStyle = COLORS.cameraFov;
          ctx.fillRect(rx, ry, rw, rh);
          ctx.strokeStyle = COLORS.cameraFovStroke;
          ctx.lineWidth = 1.2;
          ctx.strokeRect(rx, ry, rw, rh);
        }
      } catch (_) { /* 视域计算失败时跳过 */ }
    }

    // -- 5. 绘制轨迹 --
    tracks.filter(t => t.visible).forEach(track => {
      if (track.points.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = track.color || '#3fb950';
      ctx.lineWidth = 1.2;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      let started = false;
      track.points.forEach(p => {
        const x = toX(p.lng), y = toY(p.lat);
        if (!started) { ctx.moveTo(x, y); started = true; }
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    });

    // 单点轨迹→画小圆
    tracks.filter(t => t.visible).forEach(track => {
      if (track.points.length !== 1) return;
      const p = track.points[0];
      ctx.beginPath();
      ctx.arc(toX(p.lng), toY(p.lat), 3, 0, Math.PI * 2);
      ctx.fillStyle = track.color || '#3fb950';
      ctx.fill();
    });

    // -- 6. 绘制观察点 --
    observationPoints.forEach(p => {
      const x = toX(p.lng), y = toY(p.lat);
      // 外圈光晕
      ctx.beginPath();
      ctx.arc(x, y, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.pointOutline;
      ctx.globalAlpha = 0.35;
      ctx.fill();
      ctx.globalAlpha = 1;
      // 内点
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.point;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 0.6;
      ctx.stroke();
    });

    // -- 7. 绘制相机位置指示器 --
    if (cesiumViewer) {
      const camPos = cesiumViewer.camera.positionCartographic;
      const camLon = Cesium.Math.toDegrees(camPos.longitude);
      const camLat = Cesium.Math.toDegrees(camPos.latitude);
      const cx = toX(camLon), cy = toY(camLat);
      // 外圈脉冲
      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(88, 166, 255, 0.2)';
      ctx.fill();
      // 内点
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.cameraPos;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.stroke();
      // 十字线
      ctx.strokeStyle = COLORS.cameraPos;
      ctx.lineWidth = 0.7;
      ctx.beginPath(); ctx.moveTo(cx - 5, cy); ctx.lineTo(cx + 5, cy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, cy - 5); ctx.lineTo(cx, cy + 5); ctx.stroke();
    }

    // -- 8. 绘制边框 --
    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, CANVAS_W - 1, CANVAS_H - 1);

    // -- 9. 绘制指北箭头（左上角） --
    const nx = 14, ny = 18;
    ctx.fillStyle = COLORS.northArrow;
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('N', nx - 3, ny - 6);
    ctx.beginPath();
    ctx.moveTo(nx, ny + 4);
    ctx.lineTo(nx - 3, ny - 2);
    ctx.lineTo(nx + 3, ny - 2);
    ctx.closePath();
    ctx.fillStyle = COLORS.northArrow;
    ctx.fill();

  }, [tracks, observationPoints, cesiumViewer]);

  // ==================== 数据变化时重绘 ====================
  useEffect(() => {
    dirtyRef.current = true;
    draw();
  }, [draw]);

  // ==================== 监听Cesium渲染帧 ====================
  useEffect(() => {
    if (!cesiumViewer) return;

    const onRender = () => { dirtyRef.current = true; };
    cesiumViewer.scene.postRender.addEventListener(onRender);

    // raf 节流：只在 dirty=true 时重绘
    const loop = () => {
      animFrameRef.current = requestAnimationFrame(loop);
      if (dirtyRef.current) {
        dirtyRef.current = false;
        draw();
      }
    };
    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      cesiumViewer.scene.postRender.removeEventListener(onRender);
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [cesiumViewer, draw]);

  // ==================== 点击鹰眼图→3D相机飞行 ====================
  const handleClick = useCallback((e) => {
    if (!cesiumViewer) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // 从canvas坐标反算经纬度（需要重新计算数据范围）
    let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
    tracks.filter(t => t.visible).forEach(t => t.points.forEach(p => {
      if (p.lng < minLon) minLon = p.lng; if (p.lng > maxLon) maxLon = p.lng;
      if (p.lat < minLat) minLat = p.lat; if (p.lat > maxLat) maxLat = p.lat;
    }));
    observationPoints.forEach(p => {
      if (p.lng < minLon) minLon = p.lng; if (p.lng > maxLon) maxLon = p.lng;
      if (p.lat < minLat) minLat = p.lat; if (p.lat > maxLat) maxLat = p.lat;
    });
    if (!isFinite(minLon)) return;

    const spanLon = maxLon - minLon || 0.1;
    const spanLat = maxLat - minLat || 0.1;
    minLon -= spanLon * PADDING; maxLon += spanLon * PADDING;
    minLat -= spanLat * PADDING; maxLat += spanLat * PADDING;
    const canvasAspect = CANVAS_W / CANVAS_H;
    const dataAspect = (maxLon - minLon) / Math.max(maxLat - minLat, 0.01);
    if (dataAspect > canvasAspect) {
      const midLat = (minLat + maxLat) / 2;
      const halfH = (maxLon - minLon) / canvasAspect / 2;
      minLat = midLat - halfH; maxLat = midLat + halfH;
    } else {
      const midLon = (minLon + maxLon) / 2;
      const halfW = (maxLat - minLat) * canvasAspect / 2;
      minLon = midLon - halfW; maxLon = midLon + halfW;
    }

    const lon = minLon + (clickX / CANVAS_W) * (maxLon - minLon);
    const lat = maxLat - (clickY / CANVAS_H) * (maxLat - minLat);

    // 飞行到点击位置
    cesiumViewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(lon, lat, 8000),
      orientation: { heading: 0, pitch: Cesium.Math.toRadians(-60), roll: 0 },
      duration: 1.2,
    });
  }, [cesiumViewer, tracks, observationPoints]);

  // ==================== 渲染 ====================
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 16,
        right: 16,
        width: CANVAS_W,
        height: CANVAS_H,
        borderRadius: 6,
        overflow: 'hidden',
        boxShadow: '0 2px 12px rgba(0,0,0,0.5), 0 0 0 1px rgba(48,54,61,0.8)',
        cursor: 'crosshair',
        zIndex: 998,
        background: COLORS.bg,
      }}
      title="鹰眼图：点击跳转视角"
    >
      <canvas
        ref={canvasRef}
        style={{ width: CANVAS_W, height: CANVAS_H, display: 'block' }}
        onClick={handleClick}
      />
      {/* 标签 */}
      <div style={{
        position: 'absolute',
        bottom: 2,
        right: 6,
        fontSize: 9,
        color: '#6e7681',
        pointerEvents: 'none',
        fontFamily: 'monospace',
      }}>
        鹰眼图
      </div>
    </div>
  );
};

export default OverviewMap;
