export function getTotalHeight(blockRefs): number {
  if (blockRefs?.current) {
    return Object
      .values(blockRefs?.current || {})
      .reduce(
        (acc, ref) => acc + (ref?.current?.getBoundingClientRect?.()?.height || 0),
        0,
      );
  }

  return;
}
