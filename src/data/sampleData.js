// 大同地区示例观察点数据
export const sampleObservationPoints = [
  {
    id: 'point-1',
    lng: 113.677983,
    lat: 40.105708,
    elevation: 1227,
    name: '观测点1',
    description: '大同地区地貌观察点 - 黄土梁',
    createdAt: '2024-01-15T08:00:00.000Z'
  },
  {
    id: 'point-2',
    lng: 113.677172,
    lat: 40.106972,
    elevation: 1228,
    name: '观察点2',
    description: '大同地区地貌观察点 - 冲沟发育区',
    createdAt: '2024-01-15T08:30:00.000Z'
  },
  {
    id: 'point-3',
    lng: 113.676361,
    lat: 40.108236,
    elevation: 1230,
    name: '观察点3',
    description: '大同地区地貌观察点 - 土壤剖面',
    createdAt: '2024-01-15T09:00:00.000Z'
  },
  {
    id: 'point-4',
    lng: 113.67555,
    lat: 40.1095,
    elevation: 1232,
    name: '观察点4',
    description: '大同地区地貌观察点 - 植被覆盖区',
    createdAt: '2024-01-15T09:30:00.000Z'
  },
  {
    id: 'point-5',
    lng: 113.674739,
    lat: 40.110764,
    elevation: 1234,
    name: '观察点5',
    description: '大同地区地貌观察点 - 风蚀地貌',
    createdAt: '2024-01-15T10:00:00.000Z'
  },
  {
    id: 'point-6',
    lng: 113.673928,
    lat: 40.112028,
    elevation: 1236,
    name: '观察点6',
    description: '大同地区地貌观察点 - 水蚀地貌',
    createdAt: '2024-01-15T10:30:00.000Z'
  }
];

// 计算轨迹距离的辅助函数
const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371000; // 地球半径（米）
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// 计算示例轨迹的实际距离
const calculateTrackDistance = () => {
  let totalDistance = 0;
  const points = sampleTrack.points;

  for (let i = 1; i < points.length; i++) {
    const distance = calculateDistance(
      points[i - 1].lat, points[i - 1].lng,
      points[i].lat, points[i].lng
    );
    totalDistance += distance;
  }

  return totalDistance;
};

// 大同地区示例轨迹数据
export const sampleTrack = {
  id: 'sample-track-1',
  name: '大同实习路径',
  points: [
    { lng: 113.678, lat: 40.105, elevation: 1225, time: '2024-01-15T08:00:00.000Z' },
    { lng: 113.677983, lat: 40.105708, elevation: 1227, time: '2024-01-15T08:05:00.000Z' },
    { lng: 113.677172, lat: 40.106972, elevation: 1228, time: '2024-01-15T08:15:00.000Z' },
    { lng: 113.676361, lat: 40.108236, elevation: 1230, time: '2024-01-15T08:25:00.000Z' },
    { lng: 113.67555, lat: 40.1095, elevation: 1232, time: '2024-01-15T08:35:00.000Z' },
    { lng: 113.674739, lat: 40.110764, elevation: 1234, time: '2024-01-15T08:45:00.000Z' },
    { lng: 113.673928, lat: 40.112028, elevation: 1236, time: '2024-01-15T08:55:00.000Z' },
    { lng: 113.673117, lat: 40.113292, elevation: 1238, time: '2024-01-15T09:05:00.000Z' },
    { lng: 113.672306, lat: 40.114556, elevation: 1240, time: '2024-01-15T09:15:00.000Z' },
    { lng: 113.671495, lat: 40.11582, elevation: 1242, time: '2024-01-15T09:25:00.000Z' }
  ],
  color: '#1890ff',
  visible: true,
  createdAt: '2024-01-15T08:00:00.000Z',
  distance: 1250 // 约1.25公里
};

// 更新示例轨迹的距离
sampleTrack.distance = calculateTrackDistance();
