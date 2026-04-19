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

  // Keep refs for min/max so the drag handler always uses the latest bounds
  // (e.g. max can change when window is resized)
  const minRef = useRef(min);
  const maxRef = useRef(max);
  minRef.current = min;
  maxRef.current = max;

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
      // Use provided initialSize, or the last known size, or fall back to midpoint of bounds
      const startSize =
        initialSize !== undefined
          ? initialSize
          : (sizeRef.current ?? (minRef.current + maxRef.current) / 2);

      const onMouseMove = (ev) => {
        const pos = direction === 'x' ? ev.clientX : ev.clientY;
        setSize(Math.min(Math.max(startSize + pos - startPos, minRef.current), maxRef.current));
      };

      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [direction],
  );

  return [size, startResize];
};

export default usePersistentResize;
