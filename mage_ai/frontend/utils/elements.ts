export function addClassNames(className: string, classNames: string[]): string {
  const arr = (className || '')?.split(' ')?.filter(cn => !classNames?.includes(cn));

  // @ts-ignore
  return (classNames || [])?.concat(arr).join(' ');
}

export function removeClassNames(className: string, classNames: string[]): string {
  const arr = (className || '')?.split(' ')?.filter(cn => !classNames?.includes(cn));

  return (arr || [])?.join(' ');
}
