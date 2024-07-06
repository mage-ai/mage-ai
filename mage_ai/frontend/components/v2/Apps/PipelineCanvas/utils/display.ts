import { NodeItemType } from '@components/v2/Canvas/interfaces';
import { EventOperationOptionsType } from '@mana/shared/interfaces';
import { dig, flattenObject } from '@utils/hash';

export function displayable(
  node: NodeItemType,
  conditions: EventOperationOptionsType['kwargs']['conditions'],
): boolean {
  return conditions?.some(
    (condition) => Object.entries(flattenObject(condition)).every(([key, value]) => {
      if ((value ?? undefined) === undefined) return true;

      const nodeValue = dig(node, key);
      const valid = Array.isArray(value)
        ? value.every((v) => nodeValue.includes(v))
        : String(value) === String(nodeValue);

      // console.log(node, key, valid);

      return valid;
    }),
  );
}
