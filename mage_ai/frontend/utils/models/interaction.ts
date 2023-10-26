import {
  InteractionVariableType,
  InteractionVariableTypeEnum,
} from '@interfaces/InteractionType'
import {
  isInteger,
  isJsonString,
  isNumeric,
} from '@utils/string';
import { isObject } from '@utils/hash';

export function convertValueToVariableDataType(
  value: any,
  types: InteractionVariableTypeEnum[],
): any {
  if (!types || !types?.length) {
    return value;
  }

  if (types?.includes(InteractionVariableTypeEnum.LIST)) {
    const arr = isObject(value) ? Object.keys(value || {}) : [value];

    return arr.map(v => convertValueToVariableDataType(
      v,
      types?.filter(t => InteractionVariableTypeEnum.LIST !== t),
    ));
  } else if (types?.includes(InteractionVariableTypeEnum.DICTIONARY)) {
    const valueObject = isObject(value)
      ? value
      : isJsonString(value)
        ? JSON.parse(value)
        : value;

    if (isObject(valueObject)) {
      return Object.entries(valueObject).reduce((acc, [k, v]) => ({
        ...acc,
        [k]: convertValueToVariableDataType(
          v,
          types?.filter(t => InteractionVariableTypeEnum.DICTIONARY !== t),
        ),
      }), {});
    }
  }

  if (types?.includes(InteractionVariableTypeEnum.BOOLEAN)) {
    if (typeof value === 'boolean') {
      return value;
    } else if (String(value)?.toLowerCase() === 'true') {
      return true;
    }  else if (String(value)?.toLowerCase() === 'false') {
      return false;
    }
  }

  if (types?.includes?.(InteractionVariableTypeEnum.FLOAT)) {
    if (isNumeric(value)) {
      return parseFloat(value);
    }
  }

  if (types?.includes?.(InteractionVariableTypeEnum.INTEGER)) {
    if (isNumeric(value)) {
      return parseInt(value);
    }
  }

  return value;
}
