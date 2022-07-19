import React, { useEffect, useState } from 'react';

import FlexContainer from '@oracle/components/FlexContainer';
import KeyboardShortcutType from '@interfaces/KeyboardShortcutType';
import KeyboardTextGroup, { NumberOrString } from '@oracle/elements/KeyboardTextGroup';
import Text from '@oracle/elements/Text';
import { ArrowRight } from '@oracle/icons';
import {
  COMPACT_MENU_WIDTH,
  FlyoutMenuContainerStyle,
  LinkStyle,
  MENU_WIDTH,
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
  compact?: boolean;
  items: FlyoutMenuItemType[];
  left?: number;
  onClickCallback?: () => void;
  open: boolean;
  parentRef: any;
  topOffset?: number;
  uuid: string;
  width?: number;
};

function FlyoutMenu({
  compact,
  items,
  left,
  onClickCallback,
  open,
  parentRef,
  topOffset = 0,
  uuid: uuidKeyboard,
  width,
}: FlyoutMenuProps) {
  const [highlightedIndices, setHighlightedIndices] = useState<number[]>([]);
  const [submenuVisible, setSubmenuVisible] = useState({} as { [uuid: string]: boolean });
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

  let depth = 0;
  const buildMenuEl = (items: FlyoutMenuItemType[], uuid: string, visible: boolean) => (
    <FlyoutMenuContainerStyle
      compact={compact}
      style={{
        display: (visible || submenuVisible[uuid]) ? null : 'none',
        left: (
          depth === 0
            ? left || 0
            : compact ? (depth * COMPACT_MENU_WIDTH) : (depth * MENU_WIDTH)
        ),
        top: (
          depth === 0
            ? (height || 0) + topOffset
            : 0
        ),
      }}
      width={width}
    >
      {items?.map(({
        items,
        keyTextGroups,
        label,
        onClick,
        uuid,
      }: FlyoutMenuItemType, idx0: number) => {
        depth++;

        return (
          <LinkStyle
            highlighted={highlightedIndices[0] === idx0}
            key={uuid}
            onClick={(e) => {
              e.preventDefault();
              onClick?.();
              onClickCallback?.();
            }}
            onMouseEnter={() => (
              setSubmenuVisible({
                ...submenuVisible,
                [uuid]: true,
              })
            )}
            onMouseLeave={() => (
              setSubmenuVisible({
                ...submenuVisible,
                [uuid]: false,
              })
            )}
          >
            <FlexContainer
              alignItems="center"
              fullWidth
              justifyContent="space-between"
            >
              <Text>
                {label()} 
              </Text>
              {items && <ArrowRight />}
            </FlexContainer>

            {keyTextGroups && <KeyboardTextGroup keyTextGroups={keyTextGroups} />}
            {items && buildMenuEl(items, uuid, false)}
          </LinkStyle>
        );
      })}
    </FlyoutMenuContainerStyle>
  );

  return (
    items && buildMenuEl(items, undefined, open)
  );
}

export default FlyoutMenu;
