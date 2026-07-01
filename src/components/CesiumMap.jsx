import React, { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import { useAppStore } from '../stores/useAppStore';

// 设置Cesium Ion访问令牌以使用3D地形和高清影像
Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxMjhmMDU4NC0yYTQ1LTQxMzctOTEyNC1jZDA5Y2MwYWIyOGUiLCJpZCI6MTU1NzA3LCJpYXQiOjE3NTEwOTEyODF9.rXyXKrilFC20Hxc0c-ELBqGPjFD_80fMucUA01AXl-E';

const CesiumMap = ({ className }) => {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);

  const {
    tracks,
    observationPoints,
    setCesiumViewer,
    selectedTrackId,
    selectedPointId,
    cesiumViewer,
    setSelectedPoint,
    // 剖面分析相关
    analysisMode,
    profileAnchorPoints,
    addProfileAnchorPoint,
    setProfileData,
    setProfileModalVisible
  } = useAppStore();

  // 初始化Cesium
  useEffect(() => {
    if (!containerRef.current) return;

    // 防止重复创建viewer
    if (viewerRef.current) {
      console.log('Viewer已存在，跳过初始化');
      return;
    }

    // 检查window对象上是否已经有viewer
    if (window.cesiumViewer) {
      console.log('Window对象上已存在viewer，跳过初始化');
      viewerRef.current = window.cesiumViewer;
      setCesiumViewer(window.cesiumViewer);
      return;
    }

    const initializeCesium = async () => {
      try {
        console.log('开始初始化Cesium Viewer...');

        // 清除容器中可能存在的内容
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
        }

        // 设置基础配置选项 - 支持3D地形
        const viewerOptions = {
          baseLayerPicker: true, // 启用图层选择器以便选择不同底图
          geocoder: false,
          homeButton: true,
          sceneModePicker: true,
          navigationHelpButton: false,
          animation: false,
          timeline: false,
          fullscreenButton: true,
          vrButton: false,
          creditContainer: document.createElement('div'), // 隐藏版权信息
          requestRenderMode: true,
          maximumRenderTimeChange: Infinity
        };

        // 创建Viewer
        const viewer = new Cesium.Viewer(containerRef.current, viewerOptions);

        // 尝试设置地形数据
        try {
          // 使用Cesium World Terrain（需要网络连接）
          viewer.terrainProvider = await Cesium.createWorldTerrainAsync({
            requestVertexNormals: true,
            requestWaterMask: true
          });
          console.log('已加载Cesium World Terrain');
        } catch (terrainError) {
          console.warn('无法加载在线地形数据，使用椭球体地形:', terrainError);
          // 降级到椭球体地形
          viewer.terrainProvider = new Cesium.EllipsoidTerrainProvider();
        }

        // 尝试添加卫星影像底图
        try {
          // 移除默认影像图层
          viewer.imageryLayers.removeAll();

          // 首先尝试使用Cesium Ion的默认影像
          const cesiumWorldImagery = await Cesium.IonImageryProvider.fromAssetId(2);
          viewer.imageryLayers.addImageryProvider(cesiumWorldImagery);
          console.log('已加载Cesium World Imagery');
        } catch (imageryError) {
          console.warn('无法加载Cesium World Imagery，尝试备用方案:', imageryError);

          try {
            // 备用方案：使用OpenStreetMap
            const osmProvider = new Cesium.OpenStreetMapImageryProvider({
              url: 'https://a.tile.openstreetmap.org/'
            });
            viewer.imageryLayers.addImageryProvider(osmProvider);
            console.log('已加载OpenStreetMap底图');
          } catch (osmError) {
            console.warn('无法加载OSM底图，使用离线模式:', osmError);

            // 最后的备用方案：灰色背景
            viewer.scene.globe.baseColor = Cesium.Color.LIGHTGRAY;

            const canvas = document.createElement('canvas');
            canvas.width = 1;
            canvas.height = 1;
            const context = canvas.getContext('2d');
            context.fillStyle = '#f0f0f0';
            context.fillRect(0, 0, 1, 1);

            const imageryProvider = new Cesium.SingleTileImageryProvider({
              url: canvas.toDataURL(),
              rectangle: Cesium.Rectangle.MAX_VALUE,
              tileWidth: 256,
              tileHeight: 256
            });

            viewer.imageryLayers.addImageryProvider(imageryProvider);
            console.log('使用离线灰色底图');
          }
        }

        // 设置初始视角（大同地区）
        viewer.camera.setView({
          destination: Cesium.Cartesian3.fromDegrees(113.3, 40.1, 50000),
          orientation: {
            heading: 0,
            pitch: -0.5,
            roll: 0
          }
        });

        // 基础场景设置 - 启用3D地形效果
        viewer.scene.globe.depthTestAgainstTerrain = true; // 启用地形深度测试
        viewer.scene.globe.enableLighting = true; // 启用光照效果

        // 设置雾效果，增强远距离视觉效果
        viewer.scene.fog.enabled = true;
        viewer.scene.fog.density = 0.0002;

        // 设置天空盒
        viewer.scene.skyBox.show = true;

        // 禁用默认的双击行为
        if (viewer.cesiumWidget && viewer.cesiumWidget.screenSpaceEventHandler) {
          viewer.cesiumWidget.screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
        }

        viewerRef.current = viewer;
        setCesiumViewer(viewer);

        // 将viewer挂载到window对象上，方便调试
        window.cesiumViewer = viewer;

        // ---- 调试函数 ----
        window.flyToAllTracks = () => {
          const allEntities = viewer.entities.values;
          const trackEntities = allEntities.filter(entity =>
            typeof entity.id === 'string' && entity.id.startsWith('track-')
          );

          if (trackEntities.length === 0) {
            console.log('没有找到轨迹实体');
            return;
          }

          let allPositions = [];
          trackEntities.forEach(entity => {
            if (entity.polyline && entity.polyline.positions) {
              const positions = entity.polyline.positions.getValue(Cesium.JulianDate.now());
              if (positions) {
                allPositions = allPositions.concat(positions);
              }
            } else if (entity.position) {
              const position = entity.position.getValue(Cesium.JulianDate.now());
              if (position) {
                allPositions.push(position);
              }
            }
          });

          if (allPositions.length > 0) {
            try {
              const boundingSphere = Cesium.BoundingSphere.fromPoints(allPositions);
              const centerCartographic = Cesium.Cartographic.fromCartesian(boundingSphere.center);
              const centerLng = Cesium.Math.toDegrees(centerCartographic.longitude);
              const centerLat = Cesium.Math.toDegrees(centerCartographic.latitude);
              viewer.camera.flyTo({
                destination: Cesium.Cartesian3.fromDegrees(centerLng, centerLat, 10000),
                duration: 3.0
              });
            } catch (error) {
              console.error('飞行过程中出错:', error);
            }
          }
        };

        window.testFly = () => {
          const beforePosition = {
            lng: Cesium.Math.toDegrees(viewer.camera.positionCartographic.longitude),
            lat: Cesium.Math.toDegrees(viewer.camera.positionCartographic.latitude),
            height: viewer.camera.positionCartographic.height
          };
          console.log('飞行前相机位置:', beforePosition);
          viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(113.3, 40.1, 5000),
            duration: 2.0,
            complete: () => {
              const afterPosition = {
                lng: Cesium.Math.toDegrees(viewer.camera.positionCartographic.longitude),
                lat: Cesium.Math.toDegrees(viewer.camera.positionCartographic.latitude),
                height: viewer.camera.positionCartographic.height
              };
              console.log('飞行后相机位置:', afterPosition);
              for (let i = 0; i < 10; i++) {
                viewer.scene.requestRender();
              }
              console.log('飞行完成! 已强制刷新渲染');
            }
          });
        };

        window.enableContinuousRender = () => {
          viewer.scene.requestRenderMode = false;
          viewer.scene.maximumRenderTimeChange = 0;
        };

        window.enableRequestRenderMode = () => {
          viewer.scene.requestRenderMode = true;
          viewer.scene.maximumRenderTimeChange = Infinity;
        };

        window.checkRenderMode = () => {
          const info = {
            requestRenderMode: viewer.scene.requestRenderMode,
            maximumRenderTimeChange: viewer.scene.maximumRenderTimeChange,
            lastRenderTime: viewer.scene.lastRenderTime
          };
          console.log('当前渲染模式:', info);
          return info;
        };

        window.setCameraPosition = (lng, lat, height) => {
          viewer.camera.setView({
            destination: Cesium.Cartesian3.fromDegrees(lng, lat, height),
            orientation: {
              heading: 0,
              pitch: Cesium.Math.toRadians(-45),
              roll: 0
            }
          });
        };

        window.getCameraInfo = () => {
          const camera = viewer.camera;
          const cartographic = camera.positionCartographic;
          const info = {
            lng: Cesium.Math.toDegrees(cartographic.longitude),
            lat: Cesium.Math.toDegrees(cartographic.latitude),
            height: cartographic.height,
            heading: Cesium.Math.toDegrees(camera.heading),
            pitch: Cesium.Math.toDegrees(camera.pitch),
            roll: Cesium.Math.toDegrees(camera.roll)
          };
          console.log('当前相机信息:', info);
          return info;
        };

        window.fixAndShowTracks = () => {
          viewer.scene.requestRenderMode = false;
          viewer.scene.maximumRenderTimeChange = 0;

          const allEntities = viewer.entities.values;
          const trackEntities = allEntities.filter(entity =>
            typeof entity.id === 'string' && entity.id.startsWith('track-')
          );

          trackEntities.forEach((entity) => {
            entity.show = true;
            if (entity.polyline) {
              entity.polyline.show = new Cesium.ConstantProperty(true);
              entity.polyline.width = new Cesium.ConstantProperty(8);
              entity.polyline.material = new Cesium.ColorMaterialProperty(Cesium.Color.YELLOW);
              entity.polyline.clampToGround = new Cesium.ConstantProperty(false);
            }
          });

          if (trackEntities.length > 0) {
            let allPositions = [];
            trackEntities.forEach(entity => {
              if (entity.polyline && entity.polyline.positions) {
                const positions = entity.polyline.positions.getValue(Cesium.JulianDate.now());
                if (positions) allPositions = allPositions.concat(positions);
              }
            });
            if (allPositions.length > 0) {
              const boundingSphere = Cesium.BoundingSphere.fromPoints(allPositions);
              const centerCartographic = Cesium.Cartographic.fromCartesian(boundingSphere.center);
              const centerLng = Cesium.Math.toDegrees(centerCartographic.longitude);
              const centerLat = Cesium.Math.toDegrees(centerCartographic.latitude);
              const viewHeight = Math.max(boundingSphere.radius * 3, 5000);
              viewer.camera.setView({
                destination: Cesium.Cartesian3.fromDegrees(centerLng, centerLat, viewHeight),
                orientation: { heading: 0, pitch: Cesium.Math.toRadians(-45), roll: 0 }
              });
            }
          }

          setTimeout(() => {
            for (let i = 0; i < 5; i++) viewer.scene.requestRender();
          }, 100);
        };

        window.debugTracks = () => {
          const allEntities = viewer.entities.values;
          const trackEntities = allEntities.filter(entity =>
            typeof entity.id === 'string' && entity.id.startsWith('track-')
          );
          console.log('=== 轨迹调试信息 ===');
          console.log('总实体数:', allEntities.length);
          console.log('轨迹实体数:', trackEntities.length);
          trackEntities.forEach((entity, index) => {
            console.log(`轨迹 ${index + 1}:`, {
              id: entity.id,
              name: entity.name,
              show: entity.show,
              isShowing: entity.isShowing,
              polyline: entity.polyline ? {
                show: entity.polyline.show?.getValue(),
                width: entity.polyline.width?.getValue(),
                positions: entity.polyline.positions?.getValue() ?
                  `${entity.polyline.positions.getValue().length} points` : 'no positions'
              } : 'no polyline'
            });
          });
        };

        console.log('Cesium initialized successfully');

      } catch (error) {
        console.error('Failed to initialize Cesium:', error);

        // 最简单的配置作为后备
        try {
          const minimalOptions = {
            baseLayerPicker: false,
            geocoder: false,
            homeButton: false,
            sceneModePicker: false,
            navigationHelpButton: false,
            animation: false,
            timeline: false,
            fullscreenButton: false,
            vrButton: false,
            creditContainer: document.createElement('div'),
            terrainProvider: new Cesium.EllipsoidTerrainProvider(),
            requestRenderMode: true,
            maximumRenderTimeChange: Infinity
          };

          const viewer = new Cesium.Viewer(containerRef.current, minimalOptions);

          viewer.camera.setView({
            destination: Cesium.Cartesian3.fromDegrees(113.3, 40.1, 50000),
            orientation: { heading: 0, pitch: -0.5, roll: 0 }
          });

          if (viewer.cesiumWidget && viewer.cesiumWidget.screenSpaceEventHandler) {
            viewer.cesiumWidget.screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
          }

          viewerRef.current = viewer;
          setCesiumViewer(viewer);
          window.cesiumViewer = viewer;

          console.log('Cesium initialized with minimal configuration');
        } catch (fallbackError) {
          console.error('Complete failure to initialize Cesium:', fallbackError);
        }
      }
    };

    initializeCesium();

    return () => {
      if (viewerRef.current) {
        try {
          viewerRef.current.destroy();
        } catch (destroyError) {
          console.warn('Error destroying Cesium viewer:', destroyError);
        }
        viewerRef.current = null;
        if (window.cesiumViewer) {
          window.cesiumViewer = null;
        }
      }
    };
  }, [setCesiumViewer]);

  // 渲染轨迹
  useEffect(() => {
    if (!viewerRef.current) return;

    const viewer = viewerRef.current;

    console.log('轨迹渲染触发:', {
      总轨迹数: tracks.length,
      可见轨迹数: tracks.filter(track => track.visible).length,
      轨迹列表: tracks.map(t => ({ id: t.id, name: t.name, visible: t.visible, points: t.points.length }))
    });

    // 清除现有轨迹
    const existingTracks = viewer.entities.values.filter((entity) =>
      typeof entity.id === 'string' && entity.id.startsWith('track-')
    );
    existingTracks.forEach(entity => viewer.entities.remove(entity));

    // 添加可见轨迹
    tracks.filter(track => track.visible).forEach(track => {
      if (track.points.length === 0) return;

      if (track.points.length === 1) {
        // 单点轨迹显示为点标记
        const point = track.points[0];
        viewer.entities.add({
          id: `track-${track.id}`,
          position: Cesium.Cartesian3.fromDegrees(point.lng, point.lat, point.elevation || 0),
          point: {
            pixelSize: selectedTrackId === track.id ? 15 : 12,
            color: Cesium.Color.fromCssColorString(track.color),
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 2,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            disableDepthTestDistance: Number.POSITIVE_INFINITY
          },
          label: {
            text: track.name,
            font: '12pt sans-serif',
            fillColor: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -30),
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            disableDepthTestDistance: Number.POSITIVE_INFINITY
          },
          properties: {
            type: 'track',
            trackId: track.id,
            trackName: track.name
          }
        });
      } else {
        // 多点轨迹显示为线段
        const positions = track.points.map(point =>
          Cesium.Cartesian3.fromDegrees(point.lng, point.lat, point.elevation || 0)
        );

        viewer.entities.add({
          id: `track-${track.id}`,
          polyline: {
            positions,
            width: selectedTrackId === track.id ? 5 : 3,
            material: Cesium.Color.fromCssColorString(track.color),
            clampToGround: true,
            zIndex: 1
          },
          properties: {
            type: 'track',
            trackId: track.id,
            trackName: track.name
          }
        });
      }

      // 请求渲染以确保新轨迹及时显示
      viewer.scene.requestRender();
    });
  }, [tracks, selectedTrackId, cesiumViewer]);

  // 渲染观察点
  useEffect(() => {
    if (!viewerRef.current) return;

    const viewer = viewerRef.current;

    try {
      // 清除现有观察点
      const existingPoints = viewer.entities.values.filter((entity) =>
        typeof entity.id === 'string' && entity.id.startsWith('cesium-point-')
      );
      existingPoints.forEach(entity => {
        try {
          viewer.entities.remove(entity);
        } catch (error) {
          console.warn('Error removing entity:', error);
        }
      });

      // 添加观察点
      observationPoints.forEach(point => {
        try {
          // 验证坐标有效性
          if (isNaN(point.lng) || isNaN(point.lat) ||
              point.lng < -180 || point.lng > 180 ||
              point.lat < -90 || point.lat > 90) {
            console.warn(`Invalid coordinates for point ${point.id}:`, point);
            return;
          }

          const elevation = point.elevation || 0;
          if (isNaN(elevation)) {
            console.warn(`Invalid elevation for point ${point.id}:`, point.elevation);
            return;
          }

          viewer.entities.add({
            id: `cesium-point-${point.id}`,
            position: Cesium.Cartesian3.fromDegrees(point.lng, point.lat, elevation),
            point: {
              pixelSize: selectedPointId === point.id ? 12 : 10,
              color: selectedPointId === point.id ? Cesium.Color.YELLOW : Cesium.Color.RED,
              outlineColor: Cesium.Color.WHITE,
              outlineWidth: 1.5,
              heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
              disableDepthTestDistance: Number.POSITIVE_INFINITY
            },
            label: {
              text: point.name || '观察点',
              font: '12pt sans-serif',
              fillColor: Cesium.Color.WHITE,
              outlineColor: Cesium.Color.BLACK,
              outlineWidth: 2,
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
              pixelOffset: new Cesium.Cartesian2(0, -24),
              heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
              disableDepthTestDistance: Number.POSITIVE_INFINITY
            },
            properties: {
              type: 'observation-point',
              pointId: point.id,
              pointName: point.name,
              description: point.description
            }
          });
        } catch (error) {
          console.error(`Error adding observation point ${point.id}:`, error);
        }
      });

      // 添加/移除观察点后主动请求渲染
      viewer.scene.requestRender();
    } catch (error) {
      console.error('Error rendering observation points:', error);
    }
  }, [observationPoints, selectedPointId, cesiumViewer]);

  // 渲染剖面锚点和连线
  useEffect(() => {
    if (!viewerRef.current) return;
    const viewer = viewerRef.current;

    // 清除旧的剖面实体
    const existingAnchors = viewer.entities.values.filter((entity) =>
      typeof entity.id === 'string' && (entity.id.startsWith('profile-anchor-') || entity.id === 'profile-line')
    );
    existingAnchors.forEach(entity => viewer.entities.remove(entity));

    // 没有锚点就不画
    if (profileAnchorPoints.length === 0) return;

    // 添加编号标记
    profileAnchorPoints.forEach((point, index) => {
      viewer.entities.add({
        id: `profile-anchor-${index}`,
        position: Cesium.Cartesian3.fromDegrees(point.lng, point.lat, point.elevation),
        point: {
          pixelSize: 14,
          color: Cesium.Color.DEEPSKYBLUE,
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 2,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY
        },
        label: {
          text: `P${index + 1}`,
          font: 'bold 14px sans-serif',
          fillColor: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.DEEPSKYBLUE,
          outlineWidth: 3,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: new Cesium.Cartesian2(0, -20),
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY
        }
      });
    });

    // 2个以上锚点画连线
    if (profileAnchorPoints.length >= 2) {
      const positions = profileAnchorPoints.map(p =>
        Cesium.Cartesian3.fromDegrees(p.lng, p.lat, p.elevation)
      );
      viewer.entities.add({
        id: 'profile-line',
        polyline: {
          positions,
          width: 3,
          material: new Cesium.PolylineDashMaterialProperty({
            color: Cesium.Color.DEEPSKYBLUE,
            dashLength: 16
          }),
          clampToGround: true,
          zIndex: 10
        }
      });
    }

    viewer.scene.requestRender();
  }, [profileAnchorPoints, cesiumViewer]);

  // 剖面模式：监听点击事件
  useEffect(() => {
    if (!viewerRef.current || !cesiumViewer) return;

    const viewer = viewerRef.current;

    if (!viewer.cesiumWidget || !viewer.cesiumWidget.screenSpaceEventHandler) {
      console.warn('screenSpaceEventHandler not available, skipping click handler setup');
      return;
    }

    const clickHandler = async (event) => {
      // 剖面模式：点击地形添加锚点（不拾取实体）
      const storeState = useAppStore.getState();
      if (storeState.analysisMode === 'profile') {
        // 获取地形坐标
        const cartesian = viewer.scene.globe.pick(
          viewer.camera.getPickRay(event.position),
          viewer.scene
        );
        if (!cartesian) return; // 没点到地形就忽略

        const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
        const lng = Cesium.Math.toDegrees(cartographic.longitude);
        const lat = Cesium.Math.toDegrees(cartographic.latitude);
        const elevation = cartographic.height;

        console.log(`剖面锚点: lng=${lng.toFixed(6)}, lat=${lat.toFixed(6)}, elev=${elevation.toFixed(1)}m`);
        addProfileAnchorPoint({ lng, lat, elevation });
        return; // 剖面模式下不处理实体点击
      }

      // 正常模式：拾取实体
      const picked = viewer.scene.pick(event.position);
      if (!picked || !picked.id) return;

      const entity = picked.id;

      if (typeof entity.id !== 'string') return;

      if (entity.id.startsWith('track-')) {
        const trackId = entity.id.replace('track-', '');
        console.log('Clicked track:', trackId);
      } else if (entity.id.startsWith('cesium-point-')) {
        const pointId = entity.id.replace('cesium-point-', '');
        console.log('Clicked observation point:', pointId);

        setSelectedPoint(pointId);

        const point = observationPoints.find(p => p.id === pointId);
        if (point) {
          const customEvent = new CustomEvent('showObservationPointDetail', {
            detail: point
          });
          window.dispatchEvent(customEvent);
        }
      }
    };

    viewer.cesiumWidget.screenSpaceEventHandler.setInputAction(
      clickHandler,
      Cesium.ScreenSpaceEventType.LEFT_CLICK
    );

    return () => {
      if (viewer.cesiumWidget && viewer.cesiumWidget.screenSpaceEventHandler) {
        try {
          viewer.cesiumWidget.screenSpaceEventHandler.removeInputAction(
            Cesium.ScreenSpaceEventType.LEFT_CLICK
          );
        } catch (error) {
          console.warn('Error removing input action:', error);
        }
      }
    };
  }, [cesiumViewer, observationPoints, setSelectedPoint, analysisMode]);

  // 监听"计算剖面"事件，执行地形采样
  useEffect(() => {
    const handleComputeProfile = async () => {
      const state = useAppStore.getState();
      const anchors = state.profileAnchorPoints;
      if (!viewerRef.current || anchors.length < 2) return;

      const viewer = viewerRef.current;
      console.log(`开始地形采样，${anchors.length} 个锚点...`);

      try {
        // 1. 在两锚点之间按间距插值生成采样点
        const SAMPLE_INTERVAL = 50; // 采样间距（米）
        const sampleCartographics = [];

        for (let i = 0; i < anchors.length - 1; i++) {
          const from = anchors[i];
          const to = anchors[i + 1];

          // 计算两锚点间距离（Haversine）
          const dist = haversineDistance(from.lat, from.lng, to.lat, to.lng);
          const numSamples = Math.max(2, Math.ceil(dist / SAMPLE_INTERVAL));

          for (let j = 0; j < numSamples; j++) {
            const t = j / (numSamples - 1);
            const lng = from.lng + (to.lng - from.lng) * t;
            const lat = from.lat + (to.lat - from.lat) * t;
            sampleCartographics.push(Cesium.Cartographic.fromDegrees(lng, lat));
          }
        }

        console.log(`共 ${sampleCartographics.length} 个采样点，开始查询地形高程...`);

        // 2. Cesium 地形采样（异步，可能较慢）
        const sampledPositions = await Cesium.sampleTerrainMostDetailed(
          viewer.terrainProvider,
          sampleCartographics
        );

        // 3. 计算累计距离
        const profileData = [];
        let cumulativeDist = 0;

        sampledPositions.forEach((pos, index) => {
          const lng = Cesium.Math.toDegrees(pos.longitude);
          const lat = Cesium.Math.toDegrees(pos.latitude);

          if (index > 0) {
            const prev = sampledPositions[index - 1];
            const d = haversineDistance(
              Cesium.Math.toDegrees(prev.latitude),
              Cesium.Math.toDegrees(prev.longitude),
              lat,
              lng
            );
            cumulativeDist += d;
          }

          profileData.push({
            distance: cumulativeDist,
            elevation: pos.height,
            lng,
            lat
          });
        });

        console.log(`地形采样完成，总长 ${(cumulativeDist / 1000).toFixed(2)} km`);

        // 4. 更新 store + 打开弹窗
        setProfileData(profileData);
        setProfileModalVisible(true);
      } catch (error) {
        console.error('地形采样失败:', error);
        alert('地形采样失败，请确认网络连接正常（需要Cesium Ion地形服务）');
      }
    };

    window.addEventListener('computeTerrainProfile', handleComputeProfile);
    return () => {
      window.removeEventListener('computeTerrainProfile', handleComputeProfile);
    };
  }, [setProfileData, setProfileModalVisible]);

  // Haversine 距离计算（米）
  const haversineDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371000;
    const toRad = (deg) => deg * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div
        ref={containerRef}
        className={`cesium-container ${className || ''}`}
        style={{
          width: '100%',
          height: '100%',
          cursor: analysisMode === 'profile' ? 'crosshair' : 'default'
        }}
      />
      {/* 剖面模式操作提示 */}
      {analysisMode === 'profile' && (
        <div style={{
          position: 'absolute',
          top: 12,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 999,
          background: 'rgba(24, 144, 255, 0.92)',
          color: '#fff',
          padding: '8px 20px',
          borderRadius: 20,
          fontSize: 13,
          fontWeight: 500,
          pointerEvents: 'none',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
        }}>
          📍 点击地图添加剖面锚点（已添加 {profileAnchorPoints.length} 个）
          {profileAnchorPoints.length >= 2 && ' — 点击侧边栏"生成剖面"按钮'}
        </div>
      )}
    </div>
  );
};

export default CesiumMap;
