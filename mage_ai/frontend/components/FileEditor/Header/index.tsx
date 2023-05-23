import { useEffect, useMemo, useRef, useState } from 'react';

import ClickOutside from '@oracle/components/ClickOutside';
import FlexContainer from '@oracle/components/FlexContainer';
import FlyoutMenu from '@oracle/components/FlyoutMenu';
import Text from '@oracle/elements/Text';
import {
  KEY_SYMBOL_CONTROL,
  KEY_SYMBOL_META,
  KEY_SYMBOL_S,
} from '@utils/hooks/keyboardShortcuts/constants';
import {
  KEY_CODE_ARROW_LEFT,
  KEY_CODE_ARROW_RIGHT,
} from '@utils/hooks/keyboardShortcuts/constants';
import { LinkStyle } from '@components/PipelineDetail/FileHeaderMenu/index.style';
import { isMac } from '@utils/os';
import { useKeyboardContext } from '@context/Keyboard';

const NUMBER_OF_TOP_MENU_ITEMS: number = 3;

type FileHeaderMenuProps = {
  children?: any;
  fileVersionsVisible?: boolean;
  onSave?: () => void;
  setFilesVersionsVisible: (visible: boolean) => void;
};

function FileHeaderMenu({
  children,
  fileVersionsVisible,
  onSave,
  setFilesVersionsVisible,
}: FileHeaderMenuProps) {
  const [highlightedIndex, setHighlightedIndex] = useState(null);
  const refFile = useRef(null);
  const refRun = useRef(null);

  const fileItems = useMemo(() => [
    {
      disabled: !onSave,
      keyTextGroups: [[
        isMac() ? KEY_SYMBOL_META : KEY_SYMBOL_CONTROL,
        KEY_SYMBOL_S,
      ]],
      label: () => 'Save',
      onClick: () => onSave ? onSave() : null,
      uuid: 'save',
    },
  ], [
    onSave,
  ]);

  const editItems = useMemo(() => [
    {
      label: () => fileVersionsVisible ? 'Hide versions' : 'Show versions',
      onClick: () => setFilesVersionsVisible(!fileVersionsVisible),
      uuid: 'versions',
    },
  ], [
    fileVersionsVisible,
    setFilesVersionsVisible,
  ]);

  const uuidKeyboard = 'FileHeaderMenu/index';
  const {
    registerOnKeyDown,
    unregisterOnKeyDown,
  } = useKeyboardContext();
  useEffect(() => () => {
    unregisterOnKeyDown(uuidKeyboard);
  }, [unregisterOnKeyDown, uuidKeyboard]);

  registerOnKeyDown(
    uuidKeyboard,
    (event, keyMapping) => {
      if (highlightedIndex === null) {
        return;
      }

      if (keyMapping[KEY_CODE_ARROW_LEFT]) {
        setHighlightedIndex(idx => idx === 0 ? NUMBER_OF_TOP_MENU_ITEMS - 1 : idx - 1);
      } else if (keyMapping[KEY_CODE_ARROW_RIGHT]) {
        setHighlightedIndex(idx => idx === NUMBER_OF_TOP_MENU_ITEMS - 1 ? 0 : idx + 1);
      }
    },
    [
      highlightedIndex,
      setHighlightedIndex,
    ],
  );

  return (
    <ClickOutside
      onClickOutside={() => setHighlightedIndex(null)}
      open
      style={{
        position: 'relative',
      }}
    >
      <FlexContainer>
        <div style={{ position: 'relative' }}>
          <LinkStyle
            highlighted={highlightedIndex === 0}
            onClick={() => setHighlightedIndex(val => val === 0 ? null : 0)}
            onMouseEnter={() => setHighlightedIndex(val => val !== null ? 0 : null)}
            ref={refFile}
          >
            <Text>
              File
            </Text>
          </LinkStyle>

          <FlyoutMenu
            items={fileItems}
            onClickCallback={() => setHighlightedIndex(null)}
            open={highlightedIndex === 0}
            parentRef={refFile}
            uuid="FileHeaderMenu/file"
          />
        </div>

        <div style={{ position: 'relative' }}>
          <LinkStyle
            highlighted={highlightedIndex === 1}
            onClick={() => setHighlightedIndex(val => val === 1 ? null : 1)}
            onMouseEnter={() => setHighlightedIndex(val => val !== null ? 1 : null)}
            ref={refRun}
          >
            <Text>
              Edit
            </Text>
          </LinkStyle>

          <FlyoutMenu
            items={editItems}
            onClickCallback={() => setHighlightedIndex(null)}
            open={highlightedIndex === 1}
            parentRef={refRun}
            uuid="FileHeaderMenu/edit"
          />
        </div>

        {children}
      </FlexContainer>
    </ClickOutside>
  );
}

export default FileHeaderMenu;
