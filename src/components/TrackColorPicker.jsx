import React, { useState, useEffect } from 'react';
import { Popover } from 'antd';
import { ChromePicker } from 'react-color';

const TrackColorPicker = ({ color, onChange }) => {
  const [open, setOpen] = useState(false);
  const [currentColor, setCurrentColor] = useState(color);

  useEffect(() => {
    setCurrentColor(color);
  }, [color]);

  const presetColors = [
    '#ff4d4f', '#ff7a45', '#ffa940', '#ffec3d',
    '#bae637', '#73d13d', '#40a9ff', '#597ef7',
    '#9254de', '#f759ab', '#ff85c0', '#ffc069'
  ];

  const handleColorChange = (colorResult) => {
    setCurrentColor(colorResult.hex);
  };

  const handleColorChangeComplete = (colorResult) => {
    onChange(colorResult.hex);
    setOpen(false);
  };

  const handlePresetColorClick = (presetColor) => {
    setCurrentColor(presetColor);
    onChange(presetColor);
    setOpen(false);
  };

  const colorPickerContent = (
    <div>
      <ChromePicker
        color={currentColor}
        onChange={handleColorChange}
        onChangeComplete={handleColorChangeComplete}
        disableAlpha
      />
      <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {presetColors.map(presetColor => (
          <div
            key={presetColor}
            style={{
              width: 20,
              height: 20,
              backgroundColor: presetColor,
              cursor: 'pointer',
              border: presetColor === currentColor ? '2px solid #000' : '1px solid #ddd',
              borderRadius: 2
            }}
            onClick={() => handlePresetColorClick(presetColor)}
          />
        ))}
      </div>
    </div>
  );

  return (
    <Popover
      content={colorPickerContent}
      trigger="click"
      open={open}
      onOpenChange={setOpen}
      placement="right"
    >
      <div
        style={{
          width: 20,
          height: 20,
          padding: 0,
          border: '1px solid #d9d9d9',
          borderRadius: 4,
          backgroundColor: color,
          cursor: 'pointer'
        }}
      />
    </Popover>
  );
};

export default TrackColorPicker;
