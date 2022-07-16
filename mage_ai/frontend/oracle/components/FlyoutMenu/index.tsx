import { useEffect, useState } from 'react';

import KeyboardShortcutType from '@interfaces/KeyboardShortcutType';
import KeyboardTextGroup, { NumberOrString } from '@oracle/elements/KeyboardTextGroup';
import Text from '@oracle/elements/Text';
import {
  FlyoutMenuContainerStyle,
  LinkStyle,
} from './index.style';
import {
  KEY_CODE_ARROW_DOWN,
  KEY_CODE_ARROW_UP,
  KEY_CODE_ENTER,
} from '@utils/hooks/keyboardShortcuts/constants';
import { useKeyboardContext } from '@context/Keyboard';

export type FlyoutMenuItemType = {
  items?: FlyoutMenuItemType[];
  keyTextGroups?: NumberOrString[][];
  keyboardShortcutValidation?: (ks: KeyboardShortcutType, index?: number) => boolean;
  label: () => string | any;
  linkProps?: {
    as?: string;
    href: string;
  };
  onClick?: () => void;
  uuid: string;
};

export type FlyoutMenuProps = {
  items: FlyoutMenuItemType[];
  onClickCallback?: () => void;
  open: boolean;
  parentRef: any;
  uuid: string;
};

function FlyoutMenu({
  items,
  onClickCallback,
  open,
  parentRef,
  uuid: uuidKeyboard,
}: FlyoutMenuProps) {
  const [highlightedIndices, setHighlightedIndices] = useState<number[]>([]);
  const {
    height,
  } = parentRef?.current?.getBoundingClientRect?.() || {};

  const {
    registerOnKeyDown,
    unregisterOnKeyDown,
  } = useKeyboardContext();

  useEffect(() => () => {
    unregisterOnKeyDown(uuidKeyboard);
  }, [unregisterOnKeyDown, uuidKeyboard]);

  registerOnKeyDown(
    uuidKeyboard,
    (event, keyMapping, keyHistory) => {
      if (!open) {
        return;
      }

      const currentIndex = highlightedIndices[0];
      if (keyMapping[KEY_CODE_ARROW_DOWN]) {
        if (typeof currentIndex === 'undefined' || currentIndex === items.length - 1) {
          setHighlightedIndices([0]);
        } else {
          setHighlightedIndices([currentIndex + 1]);
        }
      } else if (keyMapping[KEY_CODE_ARROW_UP]) {
        if (typeof currentIndex === 'undefined' || currentIndex === 0) {
          setHighlightedIndices([items.length - 1]);
        } else {
          setHighlightedIndices([currentIndex - 1]);
        }
      } else if (keyMapping[KEY_CODE_ENTER] && typeof currentIndex !== 'undefined') {
        items[currentIndex]?.onClick?.();
        onClickCallback?.();
      } else {
        items.forEach(({ keyboardShortcutValidation }) => {
          keyboardShortcutValidation?.({ keyHistory, keyMapping });
        });
      }
    },
    [
      highlightedIndices,
      items,
      onClickCallback,
      open,
      setHighlightedIndices,
    ],
  );

  useEffect(() => {
    if (!open) {
      setHighlightedIndices([]);
    }
  }, [open]);

  return (
    <FlyoutMenuContainerStyle
      style={{
        display: !open ? 'none' : null,
        left: 0,
        top: height,
      }}
    >
      {items?.map(({
        keyTextGroups,
        label,
        onClick,
        uuid,
      }: FlyoutMenuItemType, idx0: number) => {
        return (
          <LinkStyle
            highlighted={highlightedIndices[0] === idx0}
            onClick={(e) => {
              e.preventDefault();
              onClick?.();
              onClickCallback?.();
            }}
            key={uuid}
          >
            <Text>
              {label()}
            </Text>

            {keyTextGroups && <KeyboardTextGroup keyTextGroups={keyTextGroups} />}
          </LinkStyle>
        );
      })}
    </FlyoutMenuContainerStyle>
  );
}

export default FlyoutMenu;
