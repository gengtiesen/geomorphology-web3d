# Cesium 配置说明

## Cesium Ion 访问令牌配置

本项目已经配置了有效的 Cesium Ion 访问令牌，可以直接使用所有高级功能。

### 已配置的功能

✅ **高精度地形数据**
- Cesium World Terrain 全球地形数据
- 分辨率可达 30 米
- 真实的地形阴影和光照效果
- 轨迹和标记自动贴合地形表面

✅ **多种底图选择**
- Bing Maps Aerial（高分辨率卫星影像）
- Bing Maps Road（道路地图）
- OpenStreetMap（开源地图）
- Natural Earth II（自然地球影像）
- ESRI World Imagery（ESRI世界影像）

✅ **高级渲染功能**
- 深度测试
- 地形光照
- 水面渲染
- 法线贴图

### 访问令牌位置

访问令牌在以下文件中配置：
```typescript
// src/components/CesiumMap.tsx
Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

### 如果需要更换访问令牌

1. 访问 [Cesium Ion](https://cesium.com/ion/)
2. 注册账户并获取访问令牌
3. 在 `src/components/CesiumMap.tsx` 中替换现有令牌

### 验证配置

启动应用后，您应该能够看到：
- 高质量的3D地形渲染
- 右上角的图层选择器
- 流畅的地图交互
- 轨迹自动贴合地形

如果遇到问题，请检查：
1. 网络连接是否正常
2. 访问令牌是否有效
3. 浏览器控制台是否有错误信息

## 支持的浏览器

- ✅ Chrome 80+
- ✅ Firefox 75+
- ✅ Safari 13+
- ✅ Edge 80+

## 性能优化建议

1. **使用现代浏览器**：推荐使用最新版本的 Chrome 或 Edge
2. **硬件加速**：确保浏览器启用了硬件加速
3. **显卡驱动**：更新到最新的显卡驱动程序
4. **内存**：建议至少 8GB 内存用于大型数据集

## 故障排除

如果遇到 Cesium 相关问题，请参考 [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)。 