import { NodeItemType } from '@components/v2/Canvas/interfaces';
import { EventOperationOptionsType } from '@mana/shared/interfaces';
import { dig, flattenObject } from '@utils/hash';

const CONTAINER_CLASS_NAME_PREFIX = 'ctn--';

export const LINE_CLASS_NAME = 'lne--connection';

export function buildContainerClassName(className: string): string {
  return `${CONTAINER_CLASS_NAME_PREFIX}${className}`;
}

export function extractContainerClassNames(classNames: string[]): string[] {
  return classNames?.filter(cn => cn.startsWith(CONTAINER_CLASS_NAME_PREFIX));
}

export function displayable(
  node: NodeItemType,
  conditions: EventOperationOptionsType['kwargs']['conditions'],
): boolean {
  return conditions?.some(condition =>
    Object.entries(flattenObject(condition)).every(([key, value]) => {
      if ((value ?? undefined) === undefined) return true;

      const nodeValue = dig(node, key);
      const valid = Array.isArray(value)
        ? value.every(v => nodeValue.includes(v))
        : String(value) === String(nodeValue);

      // console.log(node, key, valid);

      return valid;
    }),
  );
}
