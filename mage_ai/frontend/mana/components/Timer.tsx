import React, { useEffect, useRef } from 'react';
import { useAnimationFrame } from 'framer-motion';

import { formatDurationFromEpoch } from '@utils/string';

export default function Timer({ onChange }: {
  onChange?: (time: number) => void;
}) {
  const timerRef = useRef(null);
  const initTimeRef = useRef<number>(null);

  useAnimationFrame(() => {
    if (!initTimeRef.current) return;

    const now = Number(new Date());
    let diff = (now - initTimeRef.current) / 1000;
    if (diff >= 60 * 1000) {
      diff = Math.round(diff);
    }
    if (timerRef?.current) {
      const value = diff * 1000
      timerRef.current.innerText = formatDurationFromEpoch(value);
      if (onChange) {
        onChange(value)
      }
    }
  });

  useEffect(() => {
    if (!initTimeRef.current) {
      initTimeRef.current = Number(new Date());
    }

    return () => {
      initTimeRef.current = null;
    };
  }, []);

  return <div ref={timerRef} />;
}
