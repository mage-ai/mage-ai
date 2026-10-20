import { useEffect, useRef, useState } from 'react';

import { randomSimpleHashGenerator } from '@utils/string';

export default function useDelayFetch(endpoint: (opts?: any) => any, ...argsInit): {
  data: any;
  mutate: () => any;
} {
  let args = argsInit;
  let opts;

  const lastArg = argsInit?.slice(-1)?.[0];
  if ('condition' in lastArg || 'delay' in lastArg || 'pauseFetch' in lastArg) {
    args = args.slice(0, args?.length - 1);
    opts = lastArg;
  }

  const {
    condition,
    delay,
    pauseFetch,
  } = opts || {
    condition: undefined,
    delay: 3000,
  };

  const timeoutRef = useRef({});
  const simpleHash = randomSimpleHashGenerator();
  timeoutRef.current[simpleHash] = null;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const getReady = () => {
      clearTimeout(timeoutRef.current?.[simpleHash]);
      timeoutRef.current[simpleHash] = setTimeout(() => {
        if (typeof condition === 'undefined' || (condition !== null && typeof condition === 'function'
          ? condition?.()
          : condition
        )) {
          setReady(true);
        } else {
          getReady();
        }
      }, delay);
    };

    if (!ready && !pauseFetch) {
      getReady();
    }
  }, [condition, pauseFetch]);

  const {
    data,
    mutate,
  } = endpoint(...(ready
    ? args
    : [null, null, { pauseFetch: pauseFetch || delay }]
  ));

  return {
    data,
    mutate,
  };
}
