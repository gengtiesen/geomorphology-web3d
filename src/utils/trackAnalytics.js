/**
 * trackAnalytics.js — GPS轨迹统计计算（纯函数，无React/Cesium依赖）
 *
 * 这个模块是本课程的重点演示代码：
 *   - Array.map()     → 逐段计算距离、提取高程
 *   - Array.reduce()  → 累加总距离、累计爬升
 *   - Array.filter()  → 过滤无效数据点
 *   - Math.max/min    → 配合展开运算符求极值
 *   - Haversine公式   → 地理坐标距离计算
 */

/**
 * Haversine公式——计算两点间地表距离（米）
 * 知识点：三角函数、球面几何
 */
export function haversineDistance(a, b) {
  const R = 6371000; // 地球半径（米）
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const cosA = Math.cos(toRad(a.lat));
  const cosB = Math.cos(toRad(b.lat));
  const a2 = sinLat * sinLat + cosA * cosB * sinLng * sinLng;
  return R * 2 * Math.atan2(Math.sqrt(a2), Math.sqrt(1 - a2));
}

/**
 * 计算一条轨迹的完整统计
 *
 * @param {object} track - 轨迹对象
 * @returns {object} TrackStats 统计结果
 *
 * 讲解要点：
 *   - map() 提取每两个相邻点间的分段距离
 *   - reduce() 累加总距离
 *   - filter().map() 提取有效高程
 *   - Math.max(...arr) 找最高点（展开运算符）
 */
export function computeTrackStats(track) {
  const pts = track.points;

  // ---- map + reduce：逐段距离累加 ----
  const segmentDistances = pts.map((p, i, arr) => {
    if (i === 0) return 0; // 第一个点没有前驱
    return haversineDistance(arr[i - 1], p);
  });
  const totalDistance = segmentDistances.reduce((sum, d) => sum + d, 0);

  // ---- filter + map：提取有效高程 ----
  const elevations = pts
    .filter(p => p.elevation !== undefined && p.elevation !== null && !isNaN(p.elevation))
    .map(p => p.elevation);

  // ---- Math.max / Math.min 配合展开运算符 ----
  const maxElevation = elevations.length > 0 ? Math.max(...elevations) : 0;
  const minElevation = elevations.length > 0 ? Math.min(...elevations) : 0;

  // ---- 累计爬升 & 累计下降 ----
  let elevationGain = 0;
  let elevationLoss = 0;
  for (let i = 1; i < pts.length; i++) {
    const cur = pts[i].elevation;
    const prev = pts[i - 1].elevation;
    if (cur == null || prev == null || isNaN(cur) || isNaN(prev)) continue;
    const diff = cur - prev;
    if (diff > 0) elevationGain += diff;
    else elevationLoss += Math.abs(diff);
  }

  // ---- 速度 & 耗时（有时间戳时才计算） ----
  let avgSpeed = null;
  let totalDuration = null;
  const ptsWithTime = pts.filter(p => p.time !== undefined && p.time !== null);
  if (ptsWithTime.length >= 2) {
    const firstTime = new Date(ptsWithTime[0].time).getTime();
    const lastTime = new Date(ptsWithTime[ptsWithTime.length - 1].time).getTime();
    totalDuration = (lastTime - firstTime) / 1000; // 毫秒→秒
    if (totalDuration > 0) {
      avgSpeed = (totalDistance / 1000) / (totalDuration / 3600); // km/h
    }
  }

  return {
    name: track.name || '未命名轨迹',
    totalDistance,
    elevationGain,
    elevationLoss,
    maxElevation,
    minElevation,
    pointCount: pts.length,
    validElevationCount: elevations.length,
    avgSpeed,
    totalDuration,
  };
}

/**
 * 格式化距离
 */
export function formatDistance(meters) {
  if (meters >= 1000) return (meters / 1000).toFixed(2) + ' km';
  return meters.toFixed(0) + ' m';
}

/**
 * 格式化耗时
 */
export function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return h + 'h ' + m + 'min';
  return m + 'min';
}

/**
 * 批量计算多条轨迹的统计
 * 知识点：Array.map() 对每条轨迹调用 computeTrackStats
 */
export function computeAllTrackStats(tracks) {
  return tracks.map(track => computeTrackStats(track));
}
