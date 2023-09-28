export function isProduction() {
  return typeof process !== 'undefined' && process.env.NODE_ENV === 'production';
}

export function logRender(uuid) {
  if (!isProduction()) {
    console.log(uuid);
  }
}
