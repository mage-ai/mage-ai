import { useEffect } from 'react';

import CommandCenter from '@components/CommandCenter';
import { useKeyboardContext } from '@context/Keyboard';
import { onlyKeysPresent } from '@utils/hooks/keyboardShortcuts/utils';
import {
  KEY_CODE_META_LEFT,
  KEY_CODE_SPACE,
  KEY_CODE_META_RIGHT,
} from '@utils/hooks/keyboardShortcuts/constants';
import { pauseEvent } from '@utils/events';

function Test() {
  const uuidKeyboard = 'PipelineDetail/index';
  const {
    disableGlobalKeyboardShortcuts,
    registerOnKeyDown,
    unregisterOnKeyDown,
  } = useKeyboardContext();

  useEffect(() => () => {
    unregisterOnKeyDown(uuidKeyboard);
  }, [unregisterOnKeyDown, uuidKeyboard]);

  registerOnKeyDown(uuidKeyboard, (event, keyMapping, keyHistory) => {
    if (onlyKeysPresent([KEY_CODE_META_LEFT, KEY_CODE_SPACE], keyMapping) || onlyKeysPresent([KEY_CODE_META_RIGHT, KEY_CODE_SPACE], keyMapping)) {
      pauseEvent(event);

      alert('HELLO!');
    }
  },
  [
  ]);

  return (
    <div>
      <CommandCenter />
    </div>
  );
}

export default Test;
