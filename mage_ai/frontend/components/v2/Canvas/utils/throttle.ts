export function throttle(func: (args?: any) => any, limit: number): (args?: any) => any {
  let lastFunc: NodeJS.Timeout;
  let lastRan: number;
  return function (...args: any[]) {
    if (!lastRan) {
      func.apply(this, args);
      lastRan = Date.now();
    } else {
      clearTimeout(lastFunc);
      lastFunc = setTimeout(
        () => {
          if (Date.now() - lastRan >= limit) {
            func.apply(this, args);
            lastRan = Date.now();
          }
        },
        limit - (Date.now() - lastRan),
      );
    }
  };
}
