import { useEffect, useState } from 'react';

export default function useResizeElement() {
  const [element, setElement] = useState<Element>(null);
  const [resizers, setResizers] = useState<Element[]>(null);

  useEffect(() => {
    const Resize = (e) => {
      element.style.width = e.clientX - element.offsetLeft + 'px';
      element.style.height = e.clientY - element.offsetTop + 'px';
    };

    const stopResize = (e) => {
      window.removeEventListener('mousemove', Resize, false);
      window.removeEventListener('mouseup', stopResize, false);
    };

    const initResize = (e) => {
      if (typeof window !== 'undefined') {
        window.addEventListener('mousemove', Resize, false);
        window.addEventListener('mouseup', stopResize, false);
      }
    };

    resizers?.forEach((resizer) => {
      resizer.addEventListener('mousedown', initResize, false);
    });

    return () => {
      resizers?.forEach((resizer) => {
        resizer.removeEventListener('mousedown', initResize);
      });
    };
  }, [element, resizers]);

  return {
    setElement,
    setResizers,
  };
}
