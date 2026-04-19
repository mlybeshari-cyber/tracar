import { useState, useCallback, useEffect, useRef } from 'react';

const usePersistentResize = (key, defaultValue, min, max, direction = 'x') => {
  const [size, setSize] = useState(() => {
    const stored = localStorage.getItem(key);
    if (stored !== null) {
      const parsed = parseFloat(stored);
      if (!Number.isNaN(parsed)) {
        return Math.min(Math.max(parsed, min), max);
      }
    }
    return defaultValue;
  });

  const sizeRef = useRef(size);
  sizeRef.current = size;

  useEffect(() => {
    if (size !== null && size !== undefined) {
      localStorage.setItem(key, size.toString());
    } else {
      localStorage.removeItem(key);
    }
  }, [key, size]);

  const startResize = useCallback(
    (e, initialSize) => {
      e.preventDefault();
      const startPos = direction === 'x' ? e.clientX : e.clientY;
      const startSize = initialSize !== undefined ? initialSize : (sizeRef.current ?? (min + max) / 2);

      const onMouseMove = (ev) => {
        const pos = direction === 'x' ? ev.clientX : ev.clientY;
        setSize(Math.min(Math.max(startSize + pos - startPos, min), max));
      };

      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [direction, min, max],
  );

  return [size, startResize];
};

export default usePersistentResize;
