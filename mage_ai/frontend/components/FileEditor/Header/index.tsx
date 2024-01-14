import { createRef, useEffect, useMemo, useRef, useState } from 'react';

import Button from '@oracle/elements/Button';
import ClickOutside from '@oracle/components/ClickOutside';
import FlexContainer from '@oracle/components/FlexContainer';
import FlyoutMenu, { FlyoutMenuItemType } from '@oracle/components/FlyoutMenu';
import Text from '@oracle/elements/Text';
import { File as FileIcon } from '@oracle/icons';
import {
  KEY_SYMBOL_CONTROL,
  KEY_SYMBOL_META,
  KEY_SYMBOL_S,
} from '@utils/hooks/keyboardShortcuts/constants';
import {
  KEY_CODE_ARROW_LEFT,
  KEY_CODE_ARROW_RIGHT,
} from '@utils/hooks/keyboardShortcuts/constants';
import { SHARED_FILE_HEADER_BUTTON_PROPS } from '@components/PipelineDetail/FileHeaderMenu/constants';
import { isMac } from '@utils/os';
import { useKeyboardContext } from '@context/Keyboard';

const NUMBER_OF_TOP_MENU_ITEMS: number = 3;

export type MenuGroupType = {
  items: FlyoutMenuItemType[];
  label?: () => string;
  uuid: string;
};

type FileHeaderMenuProps = {
  children?: any;
  defaultTextContent?: boolean;
  fileVersionsVisible?: boolean;
  menuGroups?: MenuGroupType[];
  onSave?: () => void;
  rightOffset?: number;
  setFilesVersionsVisible?: (visible: boolean) => void;
};

function FileHeaderMenu({
  children,
  defaultTextContent,
  fileVersionsVisible,
  menuGroups,
  onSave,
  rightOffset,
  setFilesVersionsVisible,
}: FileHeaderMenuProps) {
  const [highlightedIndex, setHighlightedIndex] = useState(null);
  const refMenuGroups = useRef({});
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
      onClick: () => setFilesVersionsVisible?.(!fileVersionsVisible),
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
        height: '100%',
        position: 'relative',
        zIndex: 2,
      }}
    >
      <FlexContainer alignItems="center" fullHeight fullWidth>
        {!menuGroups && (
          <>
            <div style={{ position: 'relative' }}>
              <Button
                {...SHARED_FILE_HEADER_BUTTON_PROPS}
                noBackground={highlightedIndex !== 0}
                onClick={() => setHighlightedIndex(val => val === 0 ? null : 0)}
                onMouseEnter={() => setHighlightedIndex(val => val !== null ? 0 : null)}
                ref={refFile}
              >
                <Text noWrapping>
                  File
                </Text>
              </Button>

              <FlyoutMenu
                items={fileItems}
                onClickCallback={() => setHighlightedIndex(null)}
                open={highlightedIndex === 0}
                parentRef={refFile}
                uuid="FileHeaderMenu/file"
              />
            </div>

            <div style={{ position: 'relative' }}>
              <Button
                {...SHARED_FILE_HEADER_BUTTON_PROPS}
                noBackground={highlightedIndex !== 1}
                onClick={() => setHighlightedIndex(val => val === 1 ? null : 1)}
                onMouseEnter={() => setHighlightedIndex(val => val !== null ? 1 : null)}
                ref={refRun}
              >
                <Text noWrapping>
                  Edit
                </Text>
              </Button>

              <FlyoutMenu
                items={editItems}
                onClickCallback={() => setHighlightedIndex(null)}
                open={highlightedIndex === 1}
                parentRef={refRun}
                uuid="FileHeaderMenu/edit"
              />
            </div>

            <div style={{ position: 'relative' }}>
              <Button
                {...SHARED_FILE_HEADER_BUTTON_PROPS}
                beforeIcon={<FileIcon muted={!fileVersionsVisible} />}
                noBackground={!fileVersionsVisible}
                onClick={() => setFilesVersionsVisible?.(!fileVersionsVisible)}
              >
                <Text noWrapping>
                  {fileVersionsVisible ? 'Hide file versions' : 'Show file versions'}
                </Text>
              </Button>
            </div>
          </>
        )}

        {menuGroups && menuGroups?.map(({
          items,
          label,
          uuid,
        }, idx: number) => {
          const refMenuGroup = refMenuGroups?.current?.[uuid] || createRef();
          refMenuGroups.current[uuid] = refMenuGroup;

          return (
            <div key={uuid} style={{ position: 'relative' }}>
              <Button
                {...SHARED_FILE_HEADER_BUTTON_PROPS}
                noBackground={highlightedIndex !== idx}
                onClick={() => setHighlightedIndex(val => val === idx ? null : idx)}
                onMouseEnter={() => setHighlightedIndex(val => val !== null ? idx : null)}
                ref={refMenuGroup}
              >
                <Text default={defaultTextContent} noWrapping>
                  {label ? label?.() : uuid}
                </Text>
              </Button>

              <FlyoutMenu
                items={items}
                onClickCallback={() => setHighlightedIndex(null)}
                open={highlightedIndex === idx}
                parentRef={refMenuGroup}
                rightOffset={rightOffset}
                uuid={`FileHeaderMenu/${uuid}/${idx}`}
              />
            </div>
          );
        })}

        {children}
      </FlexContainer>
    </ClickOutside>
  );
}

export default FileHeaderMenu;
