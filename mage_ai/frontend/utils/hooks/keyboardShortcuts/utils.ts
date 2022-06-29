import { KeyMappingType } from '@interfaces/KeyboardShortcutType';
import {
  KEY_CODE_CONTROL,
  KEY_CODE_CONTROLS,
  KEY_CODE_META,
  KEY_CODE_METAS,
  KEY_CODE_SHIFT,
  KEY_CODE_SHIFTS,
} from '@utils/hooks/keyboardShortcuts/constants';

export function onlyKeysPresent(
  keys: (string | number)[],
  keyMapping: KeyMappingType,
): boolean {
  const keysAsStrings = keys.map(key => String(key));

  const keysHasControl = keys.includes(KEY_CODE_CONTROL);
  const keysHasMeta = keys.includes(KEY_CODE_META);
  const keysHasShift = keys.includes(KEY_CODE_SHIFT);

  const controlKeyCodesAsStrings = KEY_CODE_CONTROLS.map(key => String(key));
  const metaKeyCodesAsStrings = KEY_CODE_METAS.map(key => String(key));
  const shiftKeyCodesAsStrings = KEY_CODE_SHIFTS.map(key => String(key));

  const otherKeysPressed = Object
    .entries(keyMapping)
    .find(([k, v]) => v
      // Pressed key isn’t a key in the keys argument
      && !keysAsStrings.includes(String(k))
      && (!keysHasMeta || !metaKeyCodesAsStrings.includes(String(k)))
      // Pressed key isn’t a meta key or pressed key is not in the keys argument
      && (!keysHasControl || !controlKeyCodesAsStrings.includes(String(k)))
      && (!keysHasShift || !shiftKeyCodesAsStrings.includes(String(k)))
    );

  return keys.every(k => keyMapping[k]) && !otherKeysPressed;
}
