import { create } from 'zustand';
import { generateId } from '../utils/fileUtils';
import { sampleObservationPoints, sampleTrack } from '../data/sampleData';

export const useAppStore = create((set) => ({
  // 初始状态
  tracks: [],
  selectedTrackId: null,
  observationPoints: [],
  selectedPointId: null,
  notes: [],
  workingDirectory: null,
  sidebarCollapsed: false,
  currentTool: 'select',
  cesiumViewer: null,
  selectedObservationPointIds: [],
  currentDayId: null,
  // 剖面分析初始状态
  analysisMode: 'none',
  profileAnchorPoints: [],
  profileData: null,
  profileModalVisible: false,

  // 轨迹操作
  addTrack: (track) => set((state) => {
    // 如果已存在同 ID 的轨迹，生成新的唯一 ID 以避免冲突
    let newTrack = track;
    if (state.tracks.some(t => t.id === track.id)) {
      newTrack = { ...track, id: generateId() };
    }
    return {
      tracks: [...state.tracks, newTrack]
    };
  }),

  removeTrack: (trackId) => set((state) => ({
    tracks: state.tracks.filter(t => t.id !== trackId),
    selectedTrackId: state.selectedTrackId === trackId ? null : state.selectedTrackId
  })),

  updateTrack: (trackId, updates) => set((state) => ({
    tracks: state.tracks.map(t =>
      t.id === trackId ? { ...t, ...updates } : t
    )
  })),

  setSelectedTrack: (trackId) => set({ selectedTrackId: trackId }),

  toggleTrackVisibility: (trackId) => set((state) => ({
    tracks: state.tracks.map(t =>
      t.id === trackId ? { ...t, visible: !t.visible } : t
    )
  })),

  // 观察点操作
  addObservationPoint: (point) => set((state) => ({
    observationPoints: [...state.observationPoints.filter(p => p.id !== point.id), point]
  })),

  removeObservationPoint: (pointId) => set((state) => ({
    observationPoints: state.observationPoints.filter(p => p.id !== pointId),
    selectedPointId: state.selectedPointId === pointId ? null : state.selectedPointId
  })),

  updateObservationPoint: (pointId, updates) => set((state) => ({
    observationPoints: state.observationPoints.map(p =>
      p.id === pointId ? { ...p, ...updates } : p
    )
  })),

  setSelectedPoint: (pointId) => set({ selectedPointId: pointId }),

  // 清除观察点数据
  clearObservationPoints: () => set({
    observationPoints: [],
    selectedPointId: null
  }),

  // 笔记操作
  addNote: (note) => set((state) => ({
    notes: [...state.notes, note]
  })),

  removeNote: (noteId) => set((state) => ({
    notes: state.notes.filter(n => n.id !== noteId)
  })),

  updateNote: (noteId, updates) => set((state) => ({
    notes: state.notes.map(n =>
      n.id === noteId ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n
    )
  })),

  // 文件系统操作
  setWorkingDirectory: (directory) => set({ workingDirectory: directory }),

  // UI操作
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setCurrentTool: (tool) => set({ currentTool: tool }),

  // 地图操作
  setCesiumViewer: (viewer) => set({ cesiumViewer: viewer }),

  // 批量操作
  clearAllData: () => set({
    tracks: [],
    selectedTrackId: null,
    observationPoints: [],
    selectedPointId: null,
    notes: []
  }),

  loadSampleData: () => {
    set((state) => ({
      tracks: [...state.tracks, sampleTrack],
      observationPoints: [...state.observationPoints, ...sampleObservationPoints]
    }));
  },

  // 批量选择方法
  toggleObservationPointSelection: (pointId) => set((state) => {
    const isSelected = state.selectedObservationPointIds.includes(pointId);
    if (isSelected) {
      return {
        selectedObservationPointIds: state.selectedObservationPointIds.filter(id => id !== pointId)
      };
    } else {
      return {
        selectedObservationPointIds: [...state.selectedObservationPointIds, pointId]
      };
    }
  }),

  selectAllObservationPoints: () => set((state) => ({
    selectedObservationPointIds: state.observationPoints.map(point => point.id)
  })),

  deselectAllObservationPoints: () => set({
    selectedObservationPointIds: []
  }),

  removeSelectedObservationPoints: () => set((state) => {
    const remainingPoints = state.observationPoints.filter(
      point => !state.selectedObservationPointIds.includes(point.id)
    );
    return {
      observationPoints: remainingPoints,
      selectedObservationPointIds: []
    };
  }),

  // 设置当前天数
  setCurrentDay: (dayId) => set({ currentDayId: dayId }),

  // === 剖面分析操作 ===
  // 设置分析模式（进入/退出剖面模式）
  setAnalysisMode: (mode) => set({
    analysisMode: mode,
    // 退出时清理锚点，保留数据和弹窗状态
    ...(mode === 'none' ? { profileAnchorPoints: [] } : {})
  }),

  // 添加一个剖面锚点（地图点击时调用）
  addProfileAnchorPoint: (point) => set((state) => ({
    profileAnchorPoints: [...state.profileAnchorPoints, point]
  })),

  // 移除指定锚点
  removeProfileAnchorPoint: (index) => set((state) => ({
    profileAnchorPoints: state.profileAnchorPoints.filter((_, i) => i !== index)
  })),

  // 清除所有锚点
  clearProfileAnchors: () => set({
    profileAnchorPoints: [],
    profileData: null
  }),

  // 设置采样后的剖面数据
  setProfileData: (data) => set({ profileData: data }),

  // 控制剖面图弹窗
  setProfileModalVisible: (visible) => set({ profileModalVisible: visible }),
}));
