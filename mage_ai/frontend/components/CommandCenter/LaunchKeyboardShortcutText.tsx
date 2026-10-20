import KeyboardTextGroup from '@oracle/elements/KeyboardTextGroup';
import {
  KEY_CODE_KEY_SYMBOL_MAPPING,
  KEY_CODE_META,
  KEY_CODE_PERIOD,
} from '@utils/hooks/keyboardShortcuts/constants';
import { getSetSettings } from '@storage/CommandCenter/utils';

const DEFAULT_KEYS = [KEY_CODE_META, KEY_CODE_PERIOD];

function LaunchKeyboardShortcutText({
  settings,
  ...props
}: {
  compact?: boolean;
  settings?: any;
  small?: boolean;
}) {
  const symbols = [];

  const keys = (settings || getSetSettings())?.interface?.keyboard_shortcuts?.main;
  if (keys?.length >= 1 && keys?.every(k => k in KEY_CODE_KEY_SYMBOL_MAPPING)) {
    symbols.push(...keys.map(k => KEY_CODE_KEY_SYMBOL_MAPPING[k]));
  }

  if (!symbols?.length) {
    symbols.push(...DEFAULT_KEYS.map(k => KEY_CODE_KEY_SYMBOL_MAPPING[k]));
  }

  return (
    <KeyboardTextGroup
      addPlusSignBetweenKeys
      keyTextGroups={[symbols]}
      monospace
      {...props}
    />
  );
}

export default LaunchKeyboardShortcutText;
