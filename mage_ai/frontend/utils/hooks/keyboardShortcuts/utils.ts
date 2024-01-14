import { KeyMappingType } from '@interfaces/KeyboardShortcutType';
import {
  KEY_CODE_ALT_STRING,
  KEY_CODE_ALTS,
  KEY_CODE_CONTROL,
  KEY_CODE_CONTROLS,
  KEY_CODE_META,
  KEY_CODE_METAS,
  KEY_CODE_SHIFT,
  KEY_CODE_SHIFTS,
} from '@utils/hooks/keyboardShortcuts/constants';
import { ignoreKeys } from '@utils/hash';

export function keysPresentAndKeysRecent(
  keysPresent: (number | string)[],
  keysRecent: (number | string)[],
  keyMapping: {
    [key: number | string]: boolean;
  },
  keyHistory: (number | string)[],
) {
  const recentCount = keysRecent?.length || 0;
  const history = keyHistory?.slice(0, recentCount);

  return keysPresent?.every(key => keyMapping[key])
    && keysRecent?.every(key => history?.includes(key));
}

export function onlyKeysPresent(
  keys: (string | number)[],
  keyMapping: KeyMappingType,
  opts: {
    allowExtraKeys?: number;
  } = {
    allowExtraKeys: 0,
  },
): boolean {
  const keysAsStrings = keys.map(key => String(key));

  const keysHasAlt = keys.includes(KEY_CODE_ALT_STRING);
  const keysHasControl = keys.includes(KEY_CODE_CONTROL);
  const keysHasMeta = keys.includes(KEY_CODE_META);
  const keysHasShift = keys.includes(KEY_CODE_SHIFT);

  const altKeyCodesAsStrings = KEY_CODE_ALTS.map(key => String(key));
  const controlKeyCodesAsStrings = KEY_CODE_CONTROLS.map(key => String(key));
  const metaKeyCodesAsStrings = KEY_CODE_METAS.map(key => String(key));
  const shiftKeyCodesAsStrings = KEY_CODE_SHIFTS.map(key => String(key));

  let keyMappingUse = {
    ...keyMapping,
  };

  const allowKeyCodeMetaKey = keys?.some(key => metaKeyCodesAsStrings?.includes(String(key)))
    && !keysHasMeta;

  if (allowKeyCodeMetaKey && KEY_CODE_META in keyMappingUse) {
    delete keyMappingUse[KEY_CODE_META];
  }

  const allowKeyCodeAltKey = keys?.some(key => altKeyCodesAsStrings?.includes(String(key)));

  let otherKeysPressed = Object
    .entries(keyMappingUse)
    .filter(([k, v]) => v
      // Pressed key is a key in the keys argument
      // Pressed key isn’t a key in the keys argument
      && !keysAsStrings.includes(String(k))
      && (!keysHasMeta || !metaKeyCodesAsStrings.includes(String(k)))
      // Pressed key isn’t a meta key or pressed key is not in the keys argument
      && (!keysHasControl || !controlKeyCodesAsStrings.includes(String(k)))
      && (!keysHasShift || !shiftKeyCodesAsStrings.includes(String(k)))
      && !keys?.includes(k)
    );

  // Handle alt keys
  if (allowKeyCodeAltKey) {
    return keys?.filter?.(k => !altKeyCodesAsStrings?.includes(String(k)))?.every?.(k => keyMappingUse[k]);
  }

  return keys.every(k => keyMappingUse[k])
    && (otherKeysPressed?.length || 0) <= (opts?.allowExtraKeys || 0);
}
