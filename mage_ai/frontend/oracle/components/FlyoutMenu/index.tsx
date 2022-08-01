import React, { createRef, useEffect, useRef, useState } from 'react';

import FlexContainer from '@oracle/components/FlexContainer';
import KeyboardShortcutType from '@interfaces/KeyboardShortcutType';
import KeyboardTextGroup, { NumberOrString } from '@oracle/elements/KeyboardTextGroup';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import { ArrowRight } from '@oracle/icons';
import {
  FlyoutMenuContainerStyle,
  LinkStyle,
  TitleContainerStyle,
} from './index.style';
import {
  KEY_CODE_ARROW_DOWN,
  KEY_CODE_ARROW_UP,
  KEY_CODE_ENTER,
} from '@utils/hooks/keyboardShortcuts/constants';
import { UNIT } from '@oracle/styles/units/spacing';
import { pauseEvent } from '@utils/events';
import { useKeyboardContext } from '@context/Keyboard';

export type FlyoutMenuItemType = {
  indent?: boolean;
  items?: FlyoutMenuItemType[];
  keyTextGroups?: NumberOrString[][];
  keyboardShortcutValidation?: (ks: KeyboardShortcutType, index?: number) => boolean;
  label: () => string | any;
  linkProps?: {
    as?: string;
    href: string;
  };
  isGroupingTitle?: boolean;
  onClick?: () => void;
  uuid: string;
};

export type FlyoutMenuProps = {
  items: FlyoutMenuItemType[];
  left?: number;
  onClickCallback?: () => void;
  open: boolean;
  parentRef: any;
  rightOffset?: number;
  topOffset?: number;
  uuid: string;
  width?: number;
};

function FlyoutMenu({
  items,
  left,
  onClickCallback,
  open,
  parentRef,
  rightOffset,
  topOffset = 0,
  uuid: uuidKeyboard,
  width,
}: FlyoutMenuProps) {
  const [highlightedIndices, setHighlightedIndices] = useState<number[]>([]);
  const [submenuVisible, setSubmenuVisible] = useState<{ [uuid: string]: boolean }>({});
  const [submenuTopOffset, setSubmenuTopOffset] = useState<number>(0);
  const {
    height,
  } = parentRef?.current?.getBoundingClientRect?.() || {};
  const menuRefs = useRef({});
  const keyTextGroupRef = useRef(null);
  
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
        pauseEvent(event);
        if (typeof currentIndex === 'undefined' || currentIndex === items.length - 1) {
          setHighlightedIndices([0]);
        } else {
          setHighlightedIndices([currentIndex + 1]);
        }
      } else if (keyMapping[KEY_CODE_ARROW_UP]) {
        pauseEvent(event);
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

  const buildMenuEl = (
    items: FlyoutMenuItemType[],
    uuid: string,
    visible: boolean,
    depth: number = 0,
    refArg: React.RefObject<any>,
  ) => {
    depth += 1;

    return (
      <FlyoutMenuContainerStyle
        style={{
          display: (visible || submenuVisible[uuid]) ? null : 'none',
          left: typeof rightOffset === 'undefined' && (
            depth === 1
              ? (left || 0)
              : '100%'
          ),
          right: depth === 1
            ? rightOffset
            : null,
          top: (
            depth === 1
              ? (height || 0) + topOffset
              : (submenuTopOffset || 0)
          ),
        }}
        width={width}
      >
        {items?.map(({
          items,
          indent,
          isGroupingTitle,
          keyTextGroups,
          label,
          onClick,
          uuid,
        }: FlyoutMenuItemType, idx0: number) => {
          refArg.current[uuid] = createRef();

          return (isGroupingTitle
            ?
              <TitleContainerStyle>
                <Text bold key={uuid} muted noWrapping>
                  {label()}
                </Text>
              </TitleContainerStyle>
            :
              <LinkStyle
                highlighted={highlightedIndices[0] === idx0}
                indent={indent}
                key={uuid}
                onClick={(e) => {
                  e.preventDefault();
                  onClick?.();
                  onClickCallback?.();
                }}
                onMouseEnter={() => {
                  setSubmenuVisible((prevState) => ({
                    ...prevState,
                    [uuid]: true,
                  }));
                  if (depth === 1) {
                    setSubmenuTopOffset(refArg.current[uuid]?.current?.offsetTop || 0);
                  }
                }}
                onMouseLeave={() => {
                  setSubmenuVisible((prevState) => ({
                    ...prevState,
                    [uuid]: false,
                  }));
                }}
                ref={refArg.current[uuid]}
              >
                <FlexContainer
                  alignItems="center"
                  fullWidth
                  justifyContent="space-between"
                >
                  <Text noWrapping>
                    {label()}
                  </Text>
                  {items && (
                    <Spacing ml={2}>
                      <ArrowRight />
                    </Spacing>
                  )}

                  {keyTextGroups && (
                    <Spacing ml={4} ref={keyTextGroupRef}>
                      <KeyboardTextGroup keyTextGroups={keyTextGroups} />
                    </Spacing>
                  )}
                </FlexContainer>
                {items && (
                  buildMenuEl(
                    items,
                    uuid,
                    false,
                    depth,
                    refArg,
                  )
                )}
              </LinkStyle>
          );
        })}
      </FlyoutMenuContainerStyle>
    );
  };

  return (items
    ? buildMenuEl(items, undefined, open, 0, menuRefs)
    : null
  );
}

export default FlyoutMenu;
