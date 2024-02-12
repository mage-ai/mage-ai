import { useEffect, useRef, useState } from 'react';

export default function useDelayFetch(endpoint: (opts?: any) => any, ...argsInit): {
  data: any;
  mutate: () => any;
} {
  let args = argsInit;
  let opts;

  const lastArg = argsInit?.slice(-1)?.[0];
  if ('condition' in lastArg || 'delay' in lastArg) {
    args = args.slice(0, args?.length - 1);
    opts = lastArg;
  }

  const {
    condition,
    delay,
  } = opts || {
    condition: undefined,
    delay: 3000,
  };

  const timeoutRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const getReady = () => {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
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

    if (!ready) {
      getReady();
    }
  }, [condition]);

  const {
    data,
    mutate,
  } = endpoint(...(ready
    ? args
    : [null, null, { pauseFetch: delay }]
  ));

  return {
    data,
    mutate,
  };
}
