import { useCallback, useLayoutEffect, useState } from 'react';

const useRefContainerWidth = (refContainer) => {
  const [width, setWidth] = useState(undefined);
  const getWidth = useCallback(() => {
    setWidth(refContainer?.current?.clientWidth);
  }, [refContainer, setWidth]);
  useLayoutEffect(() => {
    getWidth();
    window.addEventListener('resize', getWidth);

    return () => window.removeEventListener('resize', getWidth);
  }, [getWidth]);

  return width;
};

export default useRefContainerWidth;
