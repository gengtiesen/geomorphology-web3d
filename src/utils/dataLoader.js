// src/utils/dataLoader.js
import { parseGPXFile, parseObservationPoints } from './fileUtils';

// 加载天数清单
export const loadDayManifest = async () => {
  try {
    const response = await fetch('./data/manifest.json');
    const data = await response.json();
    return data.days;
  } catch (error) {
    console.error('Failed to load manifest:', error);
    return [];
  }
};

// 加载具体某天的数据
export const loadDayData = async (dayManifest) => {
  try {
    let track = null;
    let observationPoints = [];

    // 加载轨迹数据
    if (dayManifest.dataFiles.track) {
      const trackResponse = await fetch(dayManifest.dataFiles.track);
      const trackFile = new File([await trackResponse.blob()], 'track.gpx');
      track = await parseGPXFile(trackFile);
    }

    // 加载观察点数据
    if (dayManifest.dataFiles.observationPoints) {
      const pointsResponse = await fetch(dayManifest.dataFiles.observationPoints);
      const pointsFile = new File([await pointsResponse.blob()], 'points.csv');
      observationPoints = await parseObservationPoints(pointsFile);
    }

    // 为观察点设置文档基础路径
    const pointsWithDocPath = observationPoints.map(point => ({
      ...point,
      docBasePath: dayManifest.docBasePath
    }));

    return {
      track,
      observationPoints: pointsWithDocPath
    };
  } catch (error) {
    console.error('Failed to load day data:', error);
    throw error;
  }
};
