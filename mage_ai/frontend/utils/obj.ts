export function truthy(value: any) {
  return typeof value !== 'undefined'
    && value !== undefined
    && value !== null
    && !isNaN(value);
}
