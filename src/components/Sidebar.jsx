import React, { useState, useEffect } from 'react';
import {
  Button,
  Space,
  Card,
  Popconfirm,
  message,
  Upload,
  Divider,
  Typography,
  Badge,
  Modal,
  Descriptions,
  Empty,
  Image,
  Collapse,
  Spin,
  Checkbox,
  Select
} from 'antd';
import {
  FileAddOutlined,
  FolderOpenOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EnvironmentOutlined,
  LineChartOutlined,
  InfoCircleOutlined,
  RiseOutlined,
  AimOutlined,
  StopOutlined
} from '@ant-design/icons';
import * as Cesium from 'cesium';
import { useAppStore } from '../stores/useAppStore';
import {
  parseGPXFile,
  parseJSONTrack,
  exportTrackAsGPX,
  exportTrackAsJSON,
  selectWorkingDirectory,
  parseObservationPoints,
  formatDistance,
  loadObservationPointDetails
} from '../utils/fileUtils';
import { loadDayManifest, loadDayData } from '../utils/dataLoader';
import TrackColorPicker from './TrackColorPicker';

const { Title, Text } = Typography;
const { Panel } = Collapse;
const { Option } = Select;

const Sidebar = () => {
  const [loading, setLoading] = useState(false);
  const [selectedObservationPoint, setSelectedObservationPoint] = useState(null);
  const [pointDetailVisible, setPointDetailVisible] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [availableDays, setAvailableDays] = useState([]);
  const [loadingDay, setLoadingDay] = useState(false);

  const {
    tracks,
    observationPoints,
    workingDirectory,
    cesiumViewer,
    addTrack,
    removeTrack,
    updateTrack,
    toggleTrackVisibility,
    addObservationPoint,
    removeObservationPoint,
    setWorkingDirectory,
    loadSampleData,
    setSelectedPoint,
    updateObservationPoint,
    selectedObservationPointIds,
    toggleObservationPointSelection,
    selectAllObservationPoints,
    deselectAllObservationPoints,
    removeSelectedObservationPoints,
    clearAllData,
    currentDayId,
    setCurrentDay,
    // 剖面分析
    analysisMode,
    profileAnchorPoints,
    setAnalysisMode,
    clearProfileAnchors,
    setProfileData,
    setProfileModalVisible
  } = useAppStore();

  // 加载可用的天数列表
  useEffect(() => {
    loadDayManifest().then(setAvailableDays);
  }, []);

  // 监听地图点击事件
  useEffect(() => {
    const handleShowObservationPointDetail = async (event) => {
      const customEvent = event;
      const point = customEvent.detail;
      await showObservationPointDetail(point);
    };

    window.addEventListener('showObservationPointDetail', handleShowObservationPointDetail);

    return () => {
      window.removeEventListener('showObservationPointDetail', handleShowObservationPointDetail);
    };
  }, []);

  // 处理天数选择
  const handleDaySelect = async (dayId) => {
    setLoadingDay(true);
    try {
      const dayManifest = availableDays.find(day => day.id === dayId);
      if (!dayManifest) {
        message.error('未找到对应的数据');
        return;
      }

      // 加载该天的数据
      const dayData = await loadDayData(dayManifest);

      // 清空当前数据
      clearAllData();

      // 添加新数据
      if (dayData.track) {
        addTrack(dayData.track);
      }

      dayData.observationPoints.forEach(point => {
        addObservationPoint(point);
      });

      // 设置当前天数
      setCurrentDay(dayId);

      // 飞行到数据区域
      if (cesiumViewer) {
        if (dayData.track) {
          flyToTrack(cesiumViewer, dayData.track);
        } else if (dayData.observationPoints.length > 0) {
          // 如果没有轨迹，就飞行到观察点
          const positions = dayData.observationPoints.map(point =>
            Cesium.Cartesian3.fromDegrees(point.lng, point.lat, point.elevation || 0)
          );
          cesiumViewer.camera.flyToBoundingSphere(
            Cesium.BoundingSphere.fromPoints(positions),
            { duration: 2.0 }
          );
        }
      }

      message.success(`已加载 ${dayManifest.displayName}`);
    } catch (error) {
      console.error('Failed to load day data:', error);
      message.error('加载数据失败: ' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setLoadingDay(false);
    }
  };

  // 更稳健的飞行定位函数
  const flyToTrack = (viewer, track, retry = 0) => {
    // 如果 Viewer 还没就绪，则稍后重试
    if (!viewer) {
      if (retry < 10) {
        const currentViewer = useAppStore.getState().cesiumViewer;
        setTimeout(() => flyToTrack(currentViewer, track, retry + 1), 500);
      } else {
        console.warn('Failed to get cesium viewer after 10 retries');
      }
      return;
    }

    if (!track || track.points.length === 0) {
      console.warn('Track is empty or invalid');
      return;
    }

    if (!viewer.scene || !viewer.camera) {
      if (retry < 10) {
        setTimeout(() => flyToTrack(viewer, track, retry + 1), 500);
      } else {
        console.warn('Failed to access camera after 10 retries');
      }
      return;
    }

    try {
      const positions = track.points.map((p) =>
        Cesium.Cartesian3.fromDegrees(p.lng, p.lat, p.elevation || 0)
      );

      let boundingSphere = null;
      try {
        boundingSphere = Cesium.BoundingSphere.fromPoints(positions);
      } catch (err) {
        console.warn('BoundingSphere.fromPoints error:', err);
      }

      if (boundingSphere && Number.isFinite(boundingSphere.radius) && boundingSphere.radius > 0) {
        if (boundingSphere.radius < 1000) {
          boundingSphere.radius = 1000;
        }
        viewer.camera.flyToBoundingSphere(boundingSphere, {
          duration: 2.0,
          offset: new Cesium.HeadingPitchRange(0, -0.5, 0)
        });
      } else {
        const first = track.points[0];
        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(first.lng, first.lat, 2000),
          duration: 2.0,
          orientation: { heading: 0, pitch: -0.5, roll: 0 }
        });
      }
    } catch (e) {
      console.warn('flyTo track failed:', e);
    }
  };

  // 处理文件导入
  const handleFileImport = async (file) => {
    setLoading(true);
    try {
      const fileName = file.name.toLowerCase();
      let track = null;

      if (fileName.endsWith('.gpx')) {
        track = await parseGPXFile(file);
      } else if (fileName.endsWith('.json')) {
        track = await parseJSONTrack(file);
      } else {
        message.error('不支持的文件格式，请选择GPX或JSON文件');
        return false;
      }

      if (track) {
        track.visible = true;
        addTrack(track);
        message.success(`成功导入轨迹: ${track.name} (${track.points.length}个点)`);

        setTimeout(() => {
          const currentViewer = useAppStore.getState().cesiumViewer;
          if (currentViewer) {
            flyToTrack(currentViewer, track);
          } else {
            setTimeout(() => {
              const retryViewer = useAppStore.getState().cesiumViewer;
              if (retryViewer) {
                flyToTrack(retryViewer, track);
              }
            }, 1000);
          }
        }, 500);
      } else {
        message.error('文件解析失败');
      }
    } catch (error) {
      console.error('Import error:', error);
      message.error('导入失败: ' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setLoading(false);
    }
    return false;
  };

  // 选择工作目录
  const handleSelectWorkingDirectory = async () => {
    try {
      const dirHandle = await selectWorkingDirectory();
      if (dirHandle) {
        setWorkingDirectory(dirHandle);
        message.success(`已选择工作目录: ${dirHandle.name}`);
      }
    } catch (error) {
      console.error('Directory selection error:', error);
      message.error('选择目录失败');
    }
  };

  // 删除轨迹
  const handleDeleteTrack = (trackId) => {
    removeTrack(trackId);
    message.success('轨迹已删除');
  };

  // 导出轨迹
  const handleExportTrack = (track, format) => {
    try {
      if (format === 'gpx') {
        exportTrackAsGPX(track);
      } else {
        exportTrackAsJSON(track);
      }
      message.success(`轨迹已导出为${format.toUpperCase()}格式`);
    } catch (error) {
      console.error('Export error:', error);
      message.error('导出失败');
    }
  };

  // 导入观察点坐标文件
  const handleImportObservationPoints = async (file) => {
    try {
      setLoading(true);
      const points = await parseObservationPoints(file);

      if (points.length === 0) {
        message.warning('文件中未找到有效的观察点数据');
        return false;
      }

      const validPoints = points.filter(point => {
        if (isNaN(point.lng) || isNaN(point.lat)) {
          console.warn(`跳过无效坐标的观察点: ${point.name}`);
          return false;
        }
        return true;
      });

      if (validPoints.length === 0) {
        message.error('文件中没有有效的观察点坐标');
        return false;
      }

      validPoints.forEach(point => addObservationPoint(point));

      message.success(`成功导入${validPoints.length}个观察点${points.length > validPoints.length ? `（跳过${points.length - validPoints.length}个无效点）` : ''}`);

      if (cesiumViewer && validPoints.length > 0) {
        try {
          const positions = validPoints.map(p =>
            Cesium.Cartesian3.fromDegrees(p.lng, p.lat, p.elevation || 0)
          );
          cesiumViewer.camera.flyToBoundingSphere(
            Cesium.BoundingSphere.fromPoints(positions),
            { duration: 2.0 }
          );
        } catch (flyError) {
          console.warn('Failed to fly to observation points:', flyError);
        }
      }
    } catch (error) {
      console.error('Import observation points error:', error);
      message.error('导入观察点失败：' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setLoading(false);
    }
    return false;
  };

  // 显示观测点详细信息
  const showObservationPointDetail = async (point) => {
    console.log('显示观察点详情:', point);
    setSelectedObservationPoint(point);
    setPointDetailVisible(true);
    setSelectedPoint(point.id);

    setLoadingDetails(true);

    try {
      const details = await loadObservationPointDetails(point.name, point.docBasePath);
      console.log('加载到的详情:', details);

      updateObservationPoint(point.id, details);

      setSelectedObservationPoint({
        ...point,
        ...details
      });

    } catch (error) {
      console.error('加载观察点详情失败:', error);
      message.error('加载观测点详细信息失败');
    } finally {
      setLoadingDetails(false);
    }
  };

  // 飞行到观测点
  const flyToObservationPoint = (point) => {
    if (cesiumViewer) {
      cesiumViewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(point.lng, point.lat, point.elevation ? point.elevation + 1000 : 1000),
        duration: 2.0,
        orientation: { heading: 0, pitch: -0.5, roll: 0 }
      });
    }
  };

  // 格式化坐标显示
  const formatCoordinate = (coord, type) => {
    const direction = type === 'lng' ? (coord >= 0 ? 'E' : 'W') : (coord >= 0 ? 'N' : 'S');
    return `${Math.abs(coord).toFixed(6)}°${direction}`;
  };

  return (
    <div className="sidebar-content">
      {/* 工具栏 */}
      <div className="sidebar-section">
        <Title level={5}>实习数据</Title>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Select
            placeholder="选择实习天数"
            style={{ width: '100%' }}
            onChange={handleDaySelect}
            loading={loadingDay}
            value={currentDayId}
          >
            {availableDays.map(day => (
              <Option key={day.id} value={day.id}>
                {day.displayName}
              </Option>
            ))}
          </Select>

          {currentDayId && (
            <div style={{ padding: 8, background: '#f5f5f5', borderRadius: 4 }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {availableDays.find(day => day.id === currentDayId)?.description}
              </Text>
            </div>
          )}

          <Upload
            accept=".gpx,.json"
            beforeUpload={handleFileImport}
            showUploadList={false}
          >
            <Button
              type="primary"
              icon={<FileAddOutlined />}
              block
              loading={loading}
            >
              导入轨迹
            </Button>
          </Upload>

          <Upload
            accept=".txt,.csv"
            beforeUpload={handleImportObservationPoints}
            showUploadList={false}
          >
            <Button
              icon={<EnvironmentOutlined />}
              block
              loading={loading}
            >
              导入观察点
            </Button>
          </Upload>

          <Button
            icon={<FolderOpenOutlined />}
            block
            onClick={handleSelectWorkingDirectory}
          >
            选择工作目录
          </Button>

          <Button
            icon={<LineChartOutlined />}
            block
            onClick={loadSampleData}
          >
            加载示例数据
          </Button>

          <Button
            type="dashed"
            block
            onClick={() => {
              const testTrack = {
                id: 'test-' + Date.now(),
                name: '测试轨迹',
                points: [
                  { lng: 113.3, lat: 40.1, elevation: 0 },
                  { lng: 113.31, lat: 40.11, elevation: 10 },
                  { lng: 113.32, lat: 40.12, elevation: 20 }
                ],
                color: '#ff0000',
                visible: true,
                createdAt: new Date().toISOString(),
                distance: 0
              };
              addTrack(testTrack);
              console.log('添加测试轨迹:', testTrack);

              setTimeout(() => {
                const viewer = useAppStore.getState().cesiumViewer;
                if (viewer) {
                  flyToTrack(viewer, testTrack);
                }
              }, 500);
            }}
          >
            添加测试轨迹
          </Button>
        </Space>
      </div>

      <Divider />

      {/* 地形分析工具 */}
      <div className="sidebar-section">
        <Title level={5}>地形分析工具</Title>
        <Space direction="vertical" style={{ width: '100%' }}>
          {analysisMode === 'none' ? (
            <Button
              icon={<RiseOutlined />}
              block
              onClick={() => setAnalysisMode('profile')}
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                color: '#fff'
              }}
            >
              高程剖面分析
            </Button>
          ) : (
            <>
              {/* 剖面模式下的操作面板 */}
              <div style={{
                padding: '10px 12px',
                background: 'linear-gradient(135deg, #e6f4ff 0%, #f0e6ff 100%)',
                borderRadius: 8,
                border: '1px solid #91caff'
              }}>
                <div style={{ fontSize: 12, color: '#1677ff', marginBottom: 8 }}>
                  <AimOutlined /> 剖面模式 — 已标记 {profileAnchorPoints.length} 个锚点
                </div>
                <Space direction="vertical" style={{ width: '100%' }} size="small">
                  <Button
                    type="primary"
                    icon={<RiseOutlined />}
                    block
                    disabled={profileAnchorPoints.length < 2}
                    onClick={() => {
                      if (profileAnchorPoints.length >= 2) {
                        window.dispatchEvent(new CustomEvent('computeTerrainProfile'));
                      }
                    }}
                  >
                    {profileAnchorPoints.length < 2 ? '至少需要2个锚点' : '生成剖面图'}
                  </Button>
                  <Space style={{ width: '100%' }}>
                    <Button
                      size="small"
                      onClick={() => {
                        const state = useAppStore.getState();
                        const pts = state.profileAnchorPoints;
                        if (pts.length > 0) {
                          useAppStore.getState().removeProfileAnchorPoint(pts.length - 1);
                        }
                      }}
                      disabled={profileAnchorPoints.length === 0}
                      style={{ flex: 1 }}
                    >
                      撤回锚点
                    </Button>
                    <Button
                      size="small"
                      danger
                      onClick={() => {
                        clearProfileAnchors();
                        setAnalysisMode('none');
                        setProfileData(null);
                      }}
                      style={{ flex: 1 }}
                    >
                      取消
                    </Button>
                  </Space>
                </Space>
              </div>
            </>
          )}
        </Space>
      </div>

      <Divider />

      {/* 工作目录信息 */}
      {workingDirectory && (
        <div className="sidebar-section">
          <Title level={5}>工作目录</Title>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {workingDirectory.name}
          </Text>
        </div>
      )}

      {/* 轨迹列表 */}
      <div className="sidebar-section">
        <Title level={5}>
          轨迹管理
          <Badge count={tracks.length} style={{ marginLeft: 8 }} />
        </Title>

        <Space direction="vertical" style={{ width: '100%' }} size="small">
          {tracks.map(track => (
            <Card
              key={track.id}
              size="small"
              style={{ marginBottom: 8 }}
              styles={{ body: { padding: '8px 12px' } }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* 颜色指示器和颜色选择器 */}
                <TrackColorPicker
                  color={track.color}
                  onChange={(color) => updateTrack(track.id, { color })}
                />

                {/* 轨迹信息 */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '13px',
                      fontWeight: 500,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {track.name}
                  </div>
                  <div style={{ fontSize: '11px', color: '#999' }}>
                    {track.points.length} 点
                    {track.distance && ` • ${formatDistance(track.distance)}`}
                  </div>
                </div>

                {/* 操作按钮 */}
                <Space size="small">
                  <Button
                    type="text"
                    size="small"
                    icon={track.visible ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                    onClick={() => toggleTrackVisibility(track.id)}
                    style={{ padding: '2px 4px' }}
                  />

                  <Button
                    type="text"
                    size="small"
                    onClick={() => flyToTrack(cesiumViewer, track)}
                    style={{ padding: '2px 4px' }}
                  >
                    定位
                  </Button>

                  <Button
                    type="text"
                    size="small"
                    icon={<DownloadOutlined />}
                    onClick={() => handleExportTrack(track, 'gpx')}
                    style={{ padding: '2px 4px' }}
                  />

                  <Popconfirm
                    title="确定删除此轨迹吗？"
                    onConfirm={() => handleDeleteTrack(track.id)}
                    okText="确定"
                    cancelText="取消"
                  >
                    <Button
                      type="text"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      style={{ padding: '2px 4px' }}
                    />
                  </Popconfirm>
                </Space>
              </div>
            </Card>
          ))}

          {tracks.length === 0 && (
            <div style={{ textAlign: 'center', padding: '20px 0', color: '#999' }}>
              <Text type="secondary">暂无轨迹数据</Text>
            </div>
          )}
        </Space>
      </div>

      <Divider />

      {/* 观察点列表 */}
      <div className="sidebar-section">
        <Title level={5}>
          观察点
          <Badge count={observationPoints.length} style={{ marginLeft: 8 }} />

          {/* 批量操作按钮 */}
          {observationPoints.length > 0 && (
            <Space size="small" style={{ marginLeft: 8 }}>
              {selectedObservationPointIds.length > 0 ? (
                <>
                  <span style={{ fontSize: '12px', color: '#666' }}>
                    已选择 {selectedObservationPointIds.length} 个
                  </span>
                  <Button
                    type="link"
                    size="small"
                    onClick={selectAllObservationPoints}
                  >
                    全选
                  </Button>
                  <Button
                    type="link"
                    size="small"
                    onClick={deselectAllObservationPoints}
                  >
                    取消
                  </Button>
                  <Popconfirm
                    title={`确定要删除选中的 ${selectedObservationPointIds.length} 个观察点吗？`}
                    onConfirm={() => {
                      removeSelectedObservationPoints();
                      message.success(`已删除 ${selectedObservationPointIds.length} 个观察点`);
                    }}
                    okText="确定"
                    cancelText="取消"
                  >
                    <Button
                      type="link"
                      danger
                      size="small"
                    >
                      删除选中
                    </Button>
                  </Popconfirm>
                </>
              ) : (
                <>
                  <Button
                    type="link"
                    size="small"
                    onClick={selectAllObservationPoints}
                  >
                    全选
                  </Button>
                  <Popconfirm
                    title="确定要删除所有观察点吗？"
                    onConfirm={() => {
                      observationPoints.forEach(point => removeObservationPoint(point.id));
                      message.success('已删除所有观察点');
                    }}
                    okText="确定"
                    cancelText="取消"
                  >
                    <Button
                      type="link"
                      danger
                      size="small"
                    >
                      清空
                    </Button>
                  </Popconfirm>
                </>
              )}
            </Space>
          )}
        </Title>

        <Space direction="vertical" style={{ width: '100%' }} size="small">
          {observationPoints.map(point => (
            <Card
              key={point.id}
              size="small"
              style={{
                marginBottom: 8,
                cursor: 'pointer',
                border: selectedObservationPointIds.includes(point.id) ? '2px solid #1890ff' : '1px solid #d9d9d9'
              }}
              styles={{ body: { padding: '8px 12px' } }}
              hoverable
              onClick={() => showObservationPointDetail(point)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* 选择框 */}
                <div onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedObservationPointIds.includes(point.id)}
                    onChange={() => {
                      toggleObservationPointSelection(point.id);
                    }}
                  />
                </div>

                <div style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: '#ff4d4f'
                }} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '13px',
                    fontWeight: 500,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {point.name}
                  </div>
                  <div style={{ fontSize: '11px', color: '#999' }}>
                    {formatCoordinate(point.lng, 'lng')} {formatCoordinate(point.lat, 'lat')}
                  </div>
                  {point.description && (
                    <div style={{
                      fontSize: '11px',
                      color: '#666',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      marginTop: 2
                    }}>
                      {point.description}
                    </div>
                  )}
                </div>

                <Space size="small">
                  <Button
                    type="text"
                    size="small"
                    icon={<InfoCircleOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      showObservationPointDetail(point);
                    }}
                    style={{ padding: '2px 4px' }}
                  />

                  <Button
                    type="text"
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      flyToObservationPoint(point);
                    }}
                    style={{ padding: '2px 4px' }}
                  >
                    定位
                  </Button>

                  <Popconfirm
                    title={`确定要删除观察点 "${point.name}" 吗？`}
                    onConfirm={(e) => {
                      e?.stopPropagation();
                      removeObservationPoint(point.id);
                      message.success('观察点已删除');
                    }}
                    okText="确定"
                    cancelText="取消"
                    onCancel={(e) => e?.stopPropagation()}
                  >
                    <Button
                      type="text"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={(e) => e.stopPropagation()}
                      style={{ padding: '2px 4px' }}
                    />
                  </Popconfirm>
                </Space>
              </div>
            </Card>
          ))}

          {observationPoints.length === 0 && (
            <div style={{ textAlign: 'center', padding: '20px 0', color: '#999' }}>
              <Text type="secondary">暂无观察点数据</Text>
            </div>
          )}
        </Space>
      </div>

      {/* 观测点详细信息Modal */}
      <Modal
        title={selectedObservationPoint?.name || '观测点详情'}
        open={pointDetailVisible}
        onCancel={() => {
          setPointDetailVisible(false);
          setSelectedObservationPoint(null);
          setSelectedPoint(null);
        }}
        footer={[
          <Button key="locate" onClick={() => {
            if (selectedObservationPoint) {
              flyToObservationPoint(selectedObservationPoint);
            }
          }}>
            地图定位
          </Button>,
          <Button key="close" onClick={() => {
            setPointDetailVisible(false);
            setSelectedObservationPoint(null);
            setSelectedPoint(null);
          }}>
            关闭
          </Button>
        ]}
        width={800}
      >
        {selectedObservationPoint ? (
          <Spin spinning={loadingDetails}>
            <Descriptions bordered column={1} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="名称">
                {selectedObservationPoint.name}
              </Descriptions.Item>

              <Descriptions.Item label="经度">
                {formatCoordinate(selectedObservationPoint.lng, 'lng')} ({selectedObservationPoint.lng.toFixed(6)})
              </Descriptions.Item>

              <Descriptions.Item label="纬度">
                {formatCoordinate(selectedObservationPoint.lat, 'lat')} ({selectedObservationPoint.lat.toFixed(6)})
              </Descriptions.Item>

              {selectedObservationPoint.elevation && (
                <Descriptions.Item label="海拔高度">
                  {selectedObservationPoint.elevation.toFixed(1)} 米
                </Descriptions.Item>
              )}

              {selectedObservationPoint.description && (
                <Descriptions.Item label="描述">
                  {selectedObservationPoint.description}
                </Descriptions.Item>
              )}

              <Descriptions.Item label="创建时间">
                {new Date(selectedObservationPoint.createdAt).toLocaleString('zh-CN')}
              </Descriptions.Item>
            </Descriptions>

            <Collapse defaultActiveKey={['knowledge', 'profile', 'photos']} size="small">
              {selectedObservationPoint?.knowledgePoints && (
                <Panel header="知识点" key="knowledge">
                  <div style={{
                    whiteSpace: 'pre-wrap',
                    lineHeight: '1.6',
                    backgroundColor: '#f5f5f5',
                    padding: '12px',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}>
                    {selectedObservationPoint.knowledgePoints}
                  </div>
                </Panel>
              )}

              {selectedObservationPoint?.profileImage && selectedObservationPoint.profileImage.length > 0 && (
                <Panel header="剖面图" key="profile">
                  <div style={{ textAlign: 'center' }}>
                    <Image.PreviewGroup>
                      {selectedObservationPoint.profileImage.map((profileImg, index) => (
                        <Image
                          key={index}
                          src={profileImg}
                          alt={`剖面图${index + 1}`}
                          style={{ maxWidth: '100%', marginBottom: '8px' }}
                          placeholder={
                            <div style={{
                              width: '100%',
                              height: '200px',
                              background: '#f5f5f5',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#999'
                            }}>
                              加载剖面图...
                            </div>
                          }
                          onError={(e) => {
                            console.error('剖面图加载失败:', profileImg);
                            e.currentTarget.alt = '图片加载失败';
                          }}
                        />
                      ))}
                    </Image.PreviewGroup>
                  </div>
                </Panel>
              )}

              {selectedObservationPoint?.photos && selectedObservationPoint.photos.length > 0 && (
                <Panel header="实地图片" key="photos">
                  <div style={{ textAlign: 'center' }}>
                    <Image.PreviewGroup>
                      {selectedObservationPoint.photos.map((photo, index) => (
                        <Image
                          key={index}
                          src={photo}
                          alt={`实地图片${index + 1}`}
                          style={{ maxWidth: '100%', marginBottom: '8px' }}
                          placeholder={
                            <div style={{
                              width: '100%',
                              height: '200px',
                              background: '#f5f5f5',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#999'
                            }}>
                              加载图片...
                            </div>
                          }
                          onError={(e) => {
                            console.error('图片加载失败:', photo);
                            e.currentTarget.alt = '图片加载失败';
                          }}
                        />
                      ))}
                    </Image.PreviewGroup>
                  </div>
                </Panel>
              )}
            </Collapse>
          </Spin>
        ) : (
          <Empty description="未选择观测点" />
        )}
      </Modal>
    </div>
  );
};

export default Sidebar;
