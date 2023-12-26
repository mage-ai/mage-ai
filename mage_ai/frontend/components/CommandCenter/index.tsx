import { useEffect, useMemo, useRef, useState } from 'react';

import ItemRow from './ItemRow';
import TextInput from '@oracle/elements/Inputs/TextInput';
import { CommandCenterItemType } from '@interfaces/CommandCenterType';
import {
  ContainerStyle,
  InputContainerStyle,
  InputStyle,
  ItemsContainerStyle,
} from './index.style';
import {
  KEY_CODE_META_LEFT,
  KEY_CODE_PERIOD,
  KEY_CODE_META_RIGHT,
} from '@utils/hooks/keyboardShortcuts/constants';
import { ITEMS } from './mocks';
import { onlyKeysPresent } from '@utils/hooks/keyboardShortcuts/utils';
import { pauseEvent } from '@utils/events';
import { useKeyboardContext } from '@context/Keyboard';

function CommandCenter() {
  const refInput = useRef(null);

  const [items, setItems] = useState<CommandCenterTypeEnum[]>(ITEMS);

  const uuidKeyboard = 'CommandCenter';
  const {
    disableGlobalKeyboardShortcuts,
    registerOnKeyDown,
    unregisterOnKeyDown,
  } = useKeyboardContext();

  useEffect(() => () => {
    unregisterOnKeyDown(uuidKeyboard);
  }, [unregisterOnKeyDown, uuidKeyboard]);

  registerOnKeyDown(uuidKeyboard, (event, keyMapping, keyHistory) => {
    if (onlyKeysPresent([KEY_CODE_META_LEFT, KEY_CODE_PERIOD], keyMapping) || onlyKeysPresent([KEY_CODE_META_RIGHT, KEY_CODE_PERIOD], keyMapping)) {
      pauseEvent(event);

      refInput?.current?.focus();
    }
  }, [
  ]);

  const itemsMemo = useMemo(() => items?.map(item => (
    <ItemRow
      key={[
        item?.title,
        item?.description,
        item?.type,
        item?.subtype,
      ]?.map(v => v || '_')?.join('/')}
      item={item}
    />
  )), [items]);

  return (
    <ContainerStyle>
      <InputContainerStyle>
        <InputStyle
          ref={refInput}
          placeholder="Search files, blocks, pipelines, applications, actions..."
        />
      </InputContainerStyle>

      <ItemsContainerStyle>
        {itemsMemo}
      </ItemsContainerStyle>
    </ContainerStyle>
  );
}

export default CommandCenter;
