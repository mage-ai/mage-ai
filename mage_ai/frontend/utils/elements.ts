import { delay } from './delay';

export function addClassNames(className: string, classNames: string[]): string {
  const arr = (className || '')?.split(' ')?.filter(cn => !classNames?.includes(cn));

  // @ts-ignore
  return (classNames || [])?.concat(arr).join(' ');
}

export function removeClassNames(
  className: string,
  classNames: string[] | ((className: string) => boolean),
): string {
  const arr = (className || '')
    ?.split(' ')
    ?.filter(cn =>
      typeof classNames === 'function' ? !classNames(cn) : !classNames?.includes(cn),
    );

  return (arr || [])?.join(' ');
}

export type BuildSetFunctionProps = (
  uuid: string,
  nodeOrNodes: any | any[],
  opts?: {
    delay?: number;
    tries?: number;
  },
) => void;

export function buildSetFunction(updateFunction) {
  async function setObject(
    uuid: string,
    nodeOrNodes: any | any[],
    opts: {
      delay?: number;
      tries?: number;
    } = {},
  ) {
    const valueIsArray = Array.isArray(nodeOrNodes);
    const nodes = valueIsArray ? nodeOrNodes : [nodeOrNodes];

    const mapping = {};

    await Promise.all(
      nodes?.map(async (node, idx: number) => {
        const tries = opts?.tries || 1;
        let attempt = 0;

        while (attempt < tries) {
          if (node?.current) {
            mapping[idx] = node?.current;
            break;
          } else {
            await delay(opts?.delay || 1000);
          }
          attempt++;
        }
      }),
    );

    const values = Object.values(mapping || {});

    updateFunction(prev => ({
      ...prev,
      [uuid]: valueIsArray ? values : values?.[0],
    }));
  }

  return setObject;
}
