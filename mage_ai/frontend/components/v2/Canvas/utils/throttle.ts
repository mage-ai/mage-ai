export function throttle(func: (...args: any[]) => void, limit: number) {
  let inThrottle: boolean = false;

  return (...args: any[]) => {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}
