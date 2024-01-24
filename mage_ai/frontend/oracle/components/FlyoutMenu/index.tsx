import React, { createRef, useEffect, useRef, useState } from 'react';
import NextLink from 'next/link';
import { useRouter } from 'next/router';

import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import KeyboardShortcutType from '@interfaces/KeyboardShortcutType';
import KeyboardTextGroup, { NumberOrString } from '@oracle/elements/KeyboardTextGroup';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import Tooltip from '@oracle/components/Tooltip';
import { ChevronRight } from '@oracle/icons';
import {
  FlyoutMenuContainerStyle,
  LinkAnchorStyle,
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

export const DEFAULT_MENU_ITEM_HEIGHT = UNIT * 4.5;

export type FlyoutMenuItemType = {
  beforeIcon?: JSX.Element;
  bold?: boolean;
  disabled?: boolean;
  indent?: boolean;
  items?: FlyoutMenuItemType[];
  keyTextGroups?: NumberOrString[][];
  keyboardShortcutValidation?: (ks: KeyboardShortcutType, index?: number) => boolean;
  label?: () => string | any;
  leftAligned?: boolean;
  linkProps?: {
    as?: string;
    href: string;
    openNewWindow?: boolean;
  };
  openConfirmationDialogue?: boolean;
  render?: (el: any) => any;
  isGroupingTitle?: boolean;
  onClick?: (opts?: any) => void;
  tooltip?: () => string;
  uuid: string;
};

export type FlyoutMenuProps = {
  alternateBackground?: boolean;
  compact?: boolean;
  customSubmenuHeights?: { [key: string]: number };
  disableKeyboardShortcuts?: boolean;
  items: FlyoutMenuItemType[];
  left?: number;
  multipleConfirmDialogues?: boolean;
  onClickCallback?: (e?: any) => void;
  open: boolean;
  parentRef: any;
  rightOffset?: number;
  roundedStyle?: boolean;
  setConfirmationDialogueOpen?: (open: any) => void;   // "open" arg can be boolean or string (uuid)
  setConfirmationAction?: (action: any) => void;
  topOffset?: number;
  uuid: string;
  width?: number;
};

function FlyoutMenu({
  alternateBackground,
  compact,
  customSubmenuHeights,
  disableKeyboardShortcuts,
  items,
  left,
  multipleConfirmDialogues,
  onClickCallback,
  open,
  parentRef,
  rightOffset,
  roundedStyle,
  setConfirmationAction,
  setConfirmationDialogueOpen,
  topOffset = 0,
  uuid: uuidKeyboard,
  width,
}: FlyoutMenuProps) {
  const [highlightedIndices, setHighlightedIndices] = useState<number[]>([]);
  const [submenuVisible, setSubmenuVisible] = useState<{ [uuid: string]: boolean }>({});
  const [submenuTopOffset, setSubmenuTopOffset] = useState<number>(0);
  const [submenuTopOffset2, setSubmenuTopOffset2] = useState<number>(0);
  const [submenuTopOffset3, setSubmenuTopOffset3] = useState<number>(0);
  const {
    height,
  } = parentRef?.current?.getBoundingClientRect?.() || {};
  const menuRefs = useRef({});
  const keyTextGroupRef = useRef(null);

  const router = useRouter();

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

      if (disableKeyboardShortcuts) {
        pauseEvent(event);
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
        const item = items[currentIndex];
        if (item) {
          if (item?.onClick) {
            item?.onClick?.(event);
          } else if (item?.linkProps) {
            if (item?.linkProps?.openNewWindow && typeof window !== 'undefined') {
              window.open(item?.linkProps?.href, '_blank');
            } else {
              router.push(item?.linkProps?.href, item?.linkProps?.as);
            }
          }
        }
        onClickCallback?.(event);
      } else {
        items?.forEach(({ keyboardShortcutValidation }) => {
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

    const hasCustomHeight = customSubmenuHeights?.hasOwnProperty(uuid);
    const submenuHeight = hasCustomHeight
      ? customSubmenuHeights?.[uuid]
      : null;
    const customHeightOffset = hasCustomHeight
      ? customSubmenuHeights?.[uuid] - DEFAULT_MENU_ITEM_HEIGHT
      : 0;

    return (
      <FlyoutMenuContainerStyle
        maxHeight={submenuHeight}
        roundedStyle={roundedStyle}
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
              : ((depth === 2
                ? submenuTopOffset
                : (depth === 3
                  ? submenuTopOffset2
                  : submenuTopOffset3)
              ) || 0)
          ) - customHeightOffset,
        }}
        width={width}
      >
        {items?.map(({
          beforeIcon,
          bold,
          disabled,
          items,
          indent,
          isGroupingTitle,
          keyTextGroups,
          label,
          leftAligned,
          linkProps,
          onClick,
          openConfirmationDialogue,
          tooltip,
          uuid,
          render,
        }: FlyoutMenuItemType, idx0: number) => {
          refArg.current[uuid] = createRef();

          const ElToUse = linkProps ? LinkAnchorStyle : LinkStyle;

          const labelToRender = label ? label?.() : uuid;

          if (isGroupingTitle) {
            return (
              <TitleContainerStyle
                key={`${uuid}-${idx0}`}
                roundedStyle={roundedStyle}
              >
                {typeof labelToRender === 'string' && (
                  <Text bold muted noWrapping>
                    {labelToRender}
                  </Text>
                )}
                {typeof labelToRender !== 'string' && labelToRender}
              </TitleContainerStyle>
            );
          }

          let el = (
            // @ts-ignore
            <ElToUse
              alternateBackground={alternateBackground || roundedStyle}
              disabled={disabled}
              highlighted={highlightedIndices[0] === idx0}
              indent={indent}
              key={`${uuid}-${idx0}`}
              largePadding={roundedStyle && !compact}
              onClick={(e) => {
                if (!linkProps) {
                  e.preventDefault();
                }

                if (openConfirmationDialogue && !disabled) {
                  setConfirmationDialogueOpen?.(multipleConfirmDialogues ? uuid : true);
                  setConfirmationAction?.(() => onClick);
                  onClickCallback?.(e);
                } else if (onClick && !disabled) {
                  onClick?.(e);
                  onClickCallback?.(e);
                }
              }}
              onMouseEnter={() => {
                setSubmenuVisible((prevState) => ({
                  ...prevState,
                  [uuid]: true,
                }));
                if (depth === 1) {
                  setSubmenuTopOffset(refArg.current[uuid]?.current?.offsetTop || 0);
                } else if (depth === 2) {
                  setSubmenuTopOffset2(refArg.current[uuid]?.current?.offsetTop || 0);
                } else if (depth === 3) {
                  setSubmenuTopOffset3(refArg.current[uuid]?.current?.offsetTop || 0);
                }
              }}
              onMouseLeave={() => {
                setSubmenuVisible((prevState) => ({
                  ...prevState,
                  [uuid]: false,
                }));
              }}
              ref={refArg.current[uuid]}
              target={linkProps && linkProps?.openNewWindow
                ? '_blank'
                : null
              }
            >
              <FlexContainer
                alignItems="center"
                style={{ gridAutoRows: 'auto' }}
                fullWidth
                justifyContent={leftAligned ? 'flex-start' : 'space-between'}
              >
                {(beforeIcon || typeof labelToRender === 'string') && (
                  <Flex alignItems="center">
                    {beforeIcon &&
                      <>
                        {beforeIcon}
                        <Spacing mr={1} />
                      </>
                    }
                    {typeof labelToRender === 'string' && (
                      <Text
                        bold={bold}
                        disabled={disabled}
                        noWrapping
                      >
                        <span role="menuitem">{labelToRender}</span>
                      </Text>
                    )}
                  </Flex>
                )}

                {typeof labelToRender !== 'string' && labelToRender}

                {items && (
                  <Spacing ml={2}>
                    <ChevronRight />
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
            </ElToUse>
          );

          if (tooltip) {
            el = (
              <Tooltip
                appearBefore
                block
                center
                description={tooltip()}
                key={`${uuid}-${idx0}`}
                size={null}
                widthFitContent
              >
                {el}
              </Tooltip>
            );
          }

          if (linkProps) {
            el = (
              <NextLink
                {...linkProps}
                key={`${uuid}-${idx0}`}
                passHref
              >
                {el}
              </NextLink>
            );
          }

          if (render) {
            el = React.cloneElement(render(el), {
              key: `${uuid}-${idx0}`,
            });
          }

          return el;
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
