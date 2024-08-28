import React, { useState, useEffect } from 'react';
import { HexColorPicker } from 'react-colorful';

function ThemeColorPicker() {
  const [color, setColor] = useState(() => localStorage.getItem('themeColor') || '#62de89');

  useEffect(() => {
    document.documentElement.style.setProperty('--color-primary', color);
    localStorage.setItem('themeColor', color);
  }, [color]);

  return (
    <div className="fixed bottom-4 right-4">
      <HexColorPicker color={color} onChange={setColor} />
    </div>
  );
}

export default ThemeColorPicker;