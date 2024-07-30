export function throttle(func, wait) {
  let timeout = null;
  let lastArgs = null;
  return function (...args) {
    if (!timeout) {
      timeout = setTimeout(() => {
        if (lastArgs) {
          func(...lastArgs);
          lastArgs = null;
          timeout = setTimeout(() => {
            timeout = null;
          }, wait);
        } else {
          timeout = null;
        }
      }, wait);
      return func(...args);
    } else {
      lastArgs = args;
    }
  };
}
