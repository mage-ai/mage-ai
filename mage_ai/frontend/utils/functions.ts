export function cloneFunction(fn) {
  const fnStr = fn.toString();
  const fnClone = new Function('return ' + fnStr);
  return fnClone();
}
