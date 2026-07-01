import { saveAs } from 'file-saver';

// 检查浏览器是否支持 File System Access API
export const isFileSystemAccessSupported = () => {
  return 'showDirectoryPicker' in window;
};

// 选择工作目录
export const selectWorkingDirectory = async () => {
  if (!isFileSystemAccessSupported()) {
    console.warn('File System Access API not supported');
    return null;
  }

  try {
    const dirHandle = await window.showDirectoryPicker();
    return dirHandle;
  } catch (error) {
    console.error('Error selecting directory:', error);
    return null;
  }
};

// 解析GPX文件
export const parseGPXFile = async (file) => {
  try {
    const text = await file.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, 'text/xml');

    // 检查解析错误
    const parseError = xmlDoc.querySelector('parsererror');
    if (parseError) {
      throw new Error('Invalid XML format');
    }

    const tracks = xmlDoc.querySelectorAll('trk');
    if (tracks.length === 0) {
      throw new Error('No tracks found in GPX file');
    }

    // 取第一个轨迹
    const track = tracks[0];
    const trackName = track.querySelector('name')?.textContent || file.name.replace('.gpx', '');

    const points = [];
    const trackPoints = track.querySelectorAll('trkpt');

    trackPoints.forEach(trkpt => {
      const lat = parseFloat(trkpt.getAttribute('lat') || '0');
      const lng = parseFloat(trkpt.getAttribute('lon') || '0');
      const eleElement = trkpt.querySelector('ele');
      const timeElement = trkpt.querySelector('time');

      const point = { lng, lat };

      if (eleElement) {
        point.elevation = parseFloat(eleElement.textContent || '0');
      }

      if (timeElement) {
        point.time = timeElement.textContent || undefined;
      }

      points.push(point);
    });

    if (points.length === 0) {
      throw new Error('No track points found');
    }

    const trackData = {
      id: generateId(),
      name: trackName,
      points,
      color: getRandomColor(),
      visible: true,
      createdAt: new Date().toISOString(),
      distance: calculateTrackDistance(points)
    };

    return trackData;
  } catch (error) {
    console.error('Error parsing GPX file:', error);
    return null;
  }
};

// 解析JSON轨迹文件
export const parseJSONTrack = async (file) => {
  try {
    const text = await file.text();
    const data = JSON.parse(text);

    // 验证数据结构
    if (!data.points || !Array.isArray(data.points)) {
      throw new Error('Invalid track data structure');
    }

    const track = {
      id: data.id || generateId(),
      name: data.name || file.name.replace('.json', ''),
      points: data.points,
      color: data.color || getRandomColor(),
      visible: data.visible !== undefined ? data.visible : true,
      createdAt: data.createdAt || new Date().toISOString(),
      distance: data.distance || calculateTrackDistance(data.points)
    };

    return track;
  } catch (error) {
    console.error('Error parsing JSON track file:', error);
    return null;
  }
};

// 导出轨迹为GPX格式
export const exportTrackAsGPX = (track) => {
  const gpxContent = generateGPXContent(track);
  const blob = new Blob([gpxContent], { type: 'application/gpx+xml' });
  saveAs(blob, `${track.name}.gpx`);
};

// 导出轨迹为JSON格式
export const exportTrackAsJSON = (track) => {
  const jsonContent = JSON.stringify(track, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  saveAs(blob, `${track.name}.json`);
};

// 生成GPX文件内容
const generateGPXContent = (track) => {
  const header = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="地貌实习可视化Web3D平台" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>${escapeXml(track.name)}</name>
    <trkseg>`;

  const points = track.points.map(point => {
    let trkpt = `      <trkpt lat="${point.lat}" lon="${point.lng}">`;
    if (point.elevation !== undefined) {
      trkpt += `\n        <ele>${point.elevation}</ele>`;
    }
    if (point.time) {
      trkpt += `\n        <time>${point.time}</time>`;
    }
    trkpt += '\n      </trkpt>';
    return trkpt;
  }).join('\n');

  const footer = `
    </trkseg>
  </trk>
</gpx>`;

  return header + '\n' + points + footer;
};

// XML转义
const escapeXml = (text) => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

// 计算轨迹总距离（使用Haversine公式）
export const calculateTrackDistance = (points) => {
  if (points.length < 2) return 0;

  let totalDistance = 0;

  for (let i = 1; i < points.length; i++) {
    const distance = calculateDistance(
      points[i - 1].lat, points[i - 1].lng,
      points[i].lat, points[i].lng
    );
    totalDistance += distance;
  }

  return totalDistance;
};

// 计算两点间距离（Haversine公式）
const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371000; // 地球半径（米）
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// 角度转弧度
const toRadians = (degrees) => {
  return degrees * (Math.PI / 180);
};

// 生成唯一ID
export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// 获取随机颜色
export const getRandomColor = () => {
  const colors = [
    '#ff4d4f', '#ff7a45', '#ffa940', '#ffec3d',
    '#bae637', '#73d13d', '#40a9ff', '#597ef7',
    '#9254de', '#f759ab', '#ff85c0', '#ffc069'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

// 读取观察点坐标文件
export const parseObservationPoints = async (file) => {
  try {
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());

    const points = lines.map((line, index) => {
      const parts = line.split(',').map(part => part.trim());
      if (parts.length >= 3) {
        const lng = parseFloat(parts[0]);
        const lat = parseFloat(parts[1]);
        const elevation = parseFloat(parts[2]);

        // 验证坐标有效性
        if (isNaN(lng) || isNaN(lat) || lng < -180 || lng > 180 || lat < -90 || lat > 90) {
          console.warn(`Invalid coordinates in line ${index + 1}: ${line}`);
          return null;
        }

        return {
          id: generateId(), // 使用唯一ID生成器而不是简单的index
          lng,
          lat,
          elevation: isNaN(elevation) ? 0 : elevation,
          name: parts[3] || `观察点${index + 1}`,
          description: parts[4] || '',
          createdAt: new Date().toISOString()
        };
      }
      return null;
    }).filter(point => point !== null);

    return points;
  } catch (error) {
    console.error('Error parsing observation points:', error);
    return [];
  }
};

// 格式化距离显示
export const formatDistance = (distance) => {
  if (distance < 1000) {
    return `${Math.round(distance)}m`;
  } else {
    return `${(distance / 1000).toFixed(2)}km`;
  }
};

// 格式化时间显示
export const formatDuration = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
};

// 加载观测点详细信息
export const loadObservationPointDetails = async (pointName, docBasePath) => {
  try {
    const details = {};

    const basePath = docBasePath
      ? `./观察点文档/${docBasePath}/`
      : './观察点文档/';

    console.log('加载观察点详情:', pointName, '路径:', basePath);

    // 知识点
    try {
      const knowledgePath = `${basePath}${pointName} 知识点.txt`;
      console.log('加载知识点:', knowledgePath);
      const response = await fetch(knowledgePath);
      if (response.ok) {
        const text = await response.text();
        // 检查是否是有效的文本内容
        if (text && !text.includes('<!doctype html>') && text.length > 10) {
          details.knowledgePoints = text;
          console.log('知识点加载成功，长度:', text.length);
        } else {
          console.warn('知识点内容无效');
        }
      }
    } catch (error) {
      console.warn('知识点加载失败:', error);
    }

    // 图片处理 - 添加更好的错误处理
    const loadImageWithFallback = async (path) => {
      try {
        console.log('检查图片:', path);
        const response = await fetch(path);

        if (!response.ok) {
          console.warn('图片请求失败:', response.status);
          return [];
        }

        // 检查内容类型
        const contentType = response.headers.get('content-type');
        console.log('图片内容类型:', contentType);

        if (!contentType || !contentType.includes('image')) {
          console.warn('返回的内容不是图片:', contentType);
          return [];
        }

        // 尝试创建图片对象来验证
        return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            console.log('图片验证成功:', path);
            resolve([path]);
          };
          img.onerror = () => {
            console.warn('图片解码失败:', path);
            resolve([]);
          };
          img.src = path;
        });
      } catch (error) {
        console.warn('图片检查失败:', error);
        return [];
      }
    };

    // 加载剖面图
    const profilePath = `${basePath}${pointName} 剖面图.jpg`;
    details.profileImage = await loadImageWithFallback(profilePath);

    // 加载实地图片
    const photoPath = `${basePath}${pointName} 图片.jpg`;
    details.photos = await loadImageWithFallback(photoPath);

    console.log('最终加载结果:', {
      知识点: !!details.knowledgePoints,
      剖面图: details.profileImage.length,
      图片: details.photos.length
    });

    return details;
  } catch (error) {
    console.error('加载观察点详情时发生错误:', error);
    return {};
  }
};
