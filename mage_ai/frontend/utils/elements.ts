import { delay } from './delay';

export function addClassNames(className: string, classNames: string[]): string {
  const arr = (className || '')?.split(' ')?.filter(cn => !classNames?.includes(cn));

  // @ts-ignore
  return (classNames || [])?.concat(arr).join(' ');
}

export function removeClassNames(className: string, classNames: string[]): string {
  const arr = (className || '')?.split(' ')?.filter(cn => !classNames?.includes(cn));

  return (arr || [])?.join(' ');
}

export type BuildSetFunctionProps = (nodeOrNodes: any | any[], opts?: {
    delay?: number;
    tries?: number;
}) => void;

export function buildSetFunction(updateFunction) {
  async function setObject(nodeOrNodes: any | any[], opts: {
    delay?: number;
    tries?: number;
  } = {}) {
    const valueIsArray = Array.isArray(nodeOrNodes);
    const nodes = valueIsArray ? nodeOrNodes : [nodeOrNodes];

    await Promise.all(nodes?.map(async (node) => {
      const tries = opts?.tries || 1;
      let attempt = 0;

      while (attempt < tries) {
        if (node?.current) {
          updateFunction((prev) => {
            if (valueIsArray) {
              return [...(prev || []), node?.current];
            } else {
              return node?.current;
            }
          });
          break;
        } else {
          await delay(opts?.delay || 1000);
        }
        attempt++;
      }
    }));
  }

  return setObject;
}
