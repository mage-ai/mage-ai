import { hyphenateCamelCase } from '@utils/string';

export function styleClassNames(
  styles: Record<string, boolean | number | string>,
  classNames: string[],
  {
    className,
    uuid,
    ...props
  }: {
    [key: string]: boolean | number | string | any;
  } = {
    className: '',
    uuid: '',
  },
): string {
  const arr: string[] = classNames || [];

  Object.entries(props || {}).forEach(([key, value]) => {
    if (typeof value !== 'undefined') {
      const k = [hyphenateCamelCase(key), ...String(value)?.replace('%', '')?.split(' ')]
        .filter(s => s?.length >= 1)
        ?.join('-');
      const cn = String(styles[k]);
      arr.push(cn);
    }
  });

  [className, uuid].forEach((key: string) => {
    if (key?.length >= 1 && !arr?.includes(key)) {
      arr.push(key);
    }
  });

  return arr
    .filter(value => typeof value !== 'undefined' && value !== null && String(value)?.length >= 1)
    .join(' ');
}
