import Colors from './colors';
import { ModeEnum, ModeType } from './modes';
import { mergeDeep, setNested } from '@utils/hash';

export function unflatten(mapping: { [key: string]: ModeType }): any {
  return Object.entries(mapping).reduce((acc, [key, modeValues]) => {
    const values = Object.entries(modeValues).reduce(
      (acc2, [mode, color]) => ({
        ...acc2,
        [mode]: Colors[color][mode],
      }),
      {},
    );
    const obj = setNested(acc, key, values);

    return mergeDeep(acc, obj);
  }, {} as any);
}

export function extractValueInMode(mode: ModeEnum, mapping: any) {
  return Object.entries(mapping).reduce(
    (acc, [key, value]) => ({
      ...acc,
      [key]:
        typeof value === 'object'
          ? Object.keys(value as object).some(key => key === mode)
            ? value[mode]
            : extractValueInMode(mode, value)
          : value,
    }),
    {},
  );
}
