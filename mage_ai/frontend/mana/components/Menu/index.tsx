import React, { createRef, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import update from 'immutability-helper';
import { ThemeContext, ThemeProvider } from 'styled-components';
import { createRoot } from 'react-dom/client';
import { Variants, motion } from 'framer-motion';

import Button from '../../elements/Button';
import DeferredRenderer from '../DeferredRenderer';
import Grid from '../Grid';
import KeyboardTextGroup from '../../elements/Text/Keyboard/Group';
import Text from '../../elements/Text';
import { CaretRight } from '@mana/icons';
import useDebounce, { DebouncerType, CancelType } from '@utils/hooks/useDebounce';
import { HEADER_Z_INDEX } from '@components/constants';
import { MenuItemType } from './interfaces';
import {
  DividerContainer,
  MenuContent,
  ItemContent,
  DividerStyled,
  MenuItemContainerStyled,
  MenuStyled,
  MenuItemStyled,
  MENU_ITEM_HEIGHT,
  MENU_MIN_WIDTH,
} from './index.style';
import { UNIT } from '@mana/themes/spaces';
import { ClientEventType } from '@mana/shared/interfaces';
import { opacity } from 'styled-system';

const DEBUG = false;

const itemVariants: Variants = {
  open: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 24 },
  },
  closed: { opacity: 0, y: 20, transition: { duration: 0.2 } },
};

type MenuProps = {
  originalBoundingContainer?: {
    height: number;
    left: number;
    top: number;
    width: number;
    x: number;
    y: number;
  };
  contained?: boolean;
  parentContainer?: HTMLElement;
  openAtPosition?: {
    x: number;
    y: number;
  };
  event?: MouseEvent | React.MouseEvent<HTMLDivElement>;
  items: MenuItemType[];
  parentItemsElementRef?: React.MutableRefObject<HTMLDivElement>;
  small?: boolean;
  standardMenu?: boolean;
  uuid: string;
};

type ItemProps = {
  contained?: boolean;
  first?: boolean;
  last?: boolean;
  item: MenuItemType;
  small?: boolean;
};

function MenuItemBase({ contained, first, item, last, small }: ItemProps,
  ref: React.Ref<HTMLElement>
) {
  const { Icon, description, divider, items, keyboardShortcuts, label, onClick, uuid } = item;
  const itemsCount = useMemo(() => items?.length || 0, [items]);

  if (divider) {
    return (
      <DividerContainer>
        <DividerStyled />
      </DividerContainer>
    );
  }

  const iconProps = {
    secondary: true,
    size: small ? 12 : undefined,
  };
  const before = Icon ? Icon(iconProps) : undefined;

  const noHover = (!onClick && !items?.length) ? 'true' : undefined;
  const isHeading = !onClick && !items?.length && !divider;

  const el = (
    <MenuItemStyled>
      <Grid rowGap={4}>
        <Grid
          alignItems="center"
          columnGap={16}
          justifyContent="space-between"
          templateColumns={['1fr', 'auto'].filter(Boolean).join(' ')}
          templateRows="1fr"
        >
          <Grid
            alignItems="center"
            columnGap={8}
            templateColumns={[before && 'auto', '1fr'].filter(Boolean).join(' ')}
          >
            {before}
            <Text bold={isHeading} muted={!!noHover} small={small}>
              {label?.() || uuid}
            </Text>
          </Grid>

          <Grid
            columnGap={4}
            templateColumns={[keyboardShortcuts && 'auto', itemsCount >= 1 && 'auto']
              .filter(Boolean)
              .join(' ')}
          >
            {keyboardShortcuts && (
              <KeyboardTextGroup
                monospace
                small={!small}
                textGroup={keyboardShortcuts}
                xsmall={small}
              />
            )}

            {itemsCount >= 1 && <CaretRight size={12} />}
          </Grid>
        </Grid>

        {description && (
          <Text muted small={!small} xsmall={small}>
            {description?.()}
          </Text>
        )}
      </Grid>
    </MenuItemStyled>
  );

  return (
    <MenuItemContainerStyled
      contained={contained}
      first={first}
      last={last}
      noHover={noHover}
      ref={ref}
    >
      <ItemContent first={first} last={last} noHover={noHover}>
        {!onClick && el}
        {onClick && (
          <Button
            asLink
            motion
            onClick={e => {
              e.preventDefault();
              onClick?.(e as ClientEventType);
            }}
            plain
            width="100%"
          >
            {el}
          </Button>
        )}
      </ItemContent>
    </MenuItemContainerStyled>
  );
}

const MenuItem = React.forwardRef(MenuItemBase);

function Menu({
  originalBoundingContainer,
  contained,
  openAtPosition,
  parentContainer,
  event,
  items,
  parentItemsElementRef,
  small,
  standardMenu,
  uuid,
}: MenuProps) {
  const themeContext = useContext(ThemeContext);
  const containerRef = useRef(null);
  const itemExpandedRef = useRef(null);
  const itemsElementRef = useRef(null);
  const itemsRootRef = useRef(null);
  const itemsRef = useRef<Record<string, React.RefObject<HTMLElement>>>({});
  const rootID = useMemo(() => `menu-item-items-${uuid}`, [uuid]);

  const [debouncer, cancel] = useDebounce();

  const renderChildItems = useCallback(
    (item: MenuItemType, event: React.MouseEvent<HTMLDivElement>, itemRef: React.RefObject<HTMLElement>) => {
      if (itemExpandedRef?.current?.uuid === item?.uuid) return;

      event.stopPropagation();
      event.preventDefault();

      if (!itemsRootRef?.current) {
        itemsElementRef.current = document.createElement('div');
        parentItemsElementRef.current.appendChild(itemsElementRef.current);
        try {
          itemsRootRef.current = createRoot(itemsElementRef.current as HTMLElement);
        } catch (error) {
          console.error(error);
          return
        }
      }

      // const element = event?.target as HTMLElement;
      // const rect = element?.getBoundingClientRect() || ({} as DOMRect);
      // const rectContainer = containerRef?.current?.getBoundingClientRect() || ({} as DOMRect);

      // Calculate the mouse position relative to the element
      // const paddingHorizontal = rect?.left - rectContainer?.left;
      // 4px for the 4 borders: 2 from the parent and 2 from the child.
      // const x = rectContainer?.left + rectContainer?.width - (rect?.left + paddingHorizontal + 4);
      // const y = rect?.top - rectContainer?.top - 2 * (rect?.height - element?.clientHeight);

      if (!itemsRootRef?.current) {
        console.error('Cannot update an unmounted root', uuid);
        return;
      }

      itemsRootRef?.current.render(item?.items?.length >= 1
        ? (
          <React.StrictMode>
            <DeferredRenderer idleTimeout={1}>
              <ThemeProvider theme={themeContext}>
                <Menu
                  contained
                  event={event}
                  items={item?.items}
                  originalBoundingContainer={originalBoundingContainer}
                  parentContainer={itemRef.current}
                  parentItemsElementRef={itemsElementRef}
                  small
                  standardMenu={standardMenu}
                  uuid={`${uuid}-${item.uuid}`}
                />
              </ThemeProvider>
            </DeferredRenderer>
          </React.StrictMode>
        )
        : null
      );

      itemExpandedRef.current = item;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [originalBoundingContainer, rootID, standardMenu, themeContext, uuid],
  );

  const itemsCount = useMemo(() => items?.length || 0, [items]);

  // Handle outside click
  const handleDocumentClick = useCallback(
    (event: MouseEvent) => {
      const node = containerRef.current;
      const root = itemsRootRef.current;

      DEBUG && console.log(node, event.target, node.contains(event.target as Node))
      if (node && !node.contains(event.target as Node)) {
        cancel();
        itemExpandedRef.current = null;
        root?.unmount();
      }
    },
    [cancel]
  );

  useEffect(() => {
    const computedStyle =
      typeof window !== 'undefined' && window.getComputedStyle(containerRef.current);

    if (computedStyle && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const rectParent = parentContainer?.getBoundingClientRect() ?? {
        left: 0,
        top: 0,
        width: 0,
        height: 0,
      };
      const position = {
        left: 0,
        top: 0,
      };

      if (openAtPosition) {
        position.left = openAtPosition.left;
        position.top = openAtPosition.top;
      } else if (rectParent) {
        position.left = rectParent.left + rectParent.width;
        position.top = rectParent.top;
      }

      const boundBox = originalBoundingContainer ?? rectParent ?? { left: 0, top: 0, width: 0, height: 0 };

      const padding = UNIT;

      const right = boundBox.left + boundBox.width;
      DEBUG && console.log('right', right)
      const menuWidth = rect.width;
      DEBUG && console.log('menuWidth', menuWidth)
      const leftOffset = padding + menuWidth;
      DEBUG && console.log('leftOffset', leftOffset)
      if (position.left + leftOffset >= right) {
        position.left = rectParent.left - leftOffset;
      }
      DEBUG && console.log('left', position.left)

      const bottom = boundBox.top + boundBox.height;
      DEBUG && console.log('bottom', bottom)
      const menuHeight = rect.height;
      DEBUG && console.log('menuHeight', menuHeight)
      const topOffset = 0;
      DEBUG && console.log('topOffset', topOffset)
      if (position.top + topOffset >= bottom) {
        position.top = (rectParent.top) - (topOffset - rectParent.height);
      }
      DEBUG && console.log('position.top', position.top)
      DEBUG && console.log('items', position, rectParent, boundBox)

      containerRef.current.style.left = `${position.left}px`;
      containerRef.current.style.top = `${position.top}px`;
      containerRef.current.style.opacity = '1';
      containerRef.current.style.visibility = 'visible';
      containerRef.current.style.zIndex = `${HEADER_Z_INDEX + 100}`;
    }

    if (standardMenu) {
      document.addEventListener('click', handleDocumentClick);
    }

    const root = itemsRootRef.current;

    return () => {
      cancel();
      root && root?.unmount();
      itemsRootRef.current = null;

      if (standardMenu) {
        document.removeEventListener('click', handleDocumentClick);
      }
    };
  }, [cancel, handleDocumentClick, openAtPosition, originalBoundingContainer, parentContainer, rootID, standardMenu, uuid]);

  return (
    <MenuStyled
      contained={contained ? 'true' : undefined}
      ref={containerRef}
      style={{
        left: 0,
        opacity: 0,
        top: 0,
        visibility: 'hidden',
        zIndex: -1,
      }}
    >
      <MenuContent
        animate={{ opacity: 1, scale: 1 }}
        initial={{ opacity: 0.75, scale: 0.95 }}
        transition={{ duration: 0.01, ease: [0.0, 0.0, 0.58, 1.0] }}
      >
        {itemsCount >= 1 && (
          <motion.div
            style={{ pointerEvents: 'auto' }}
            variants={{
              open: {
                clipPath: 'inset(0% 0% 0% 0% round 10px)',
                transition: {
                  type: 'spring',
                  bounce: 0,
                  duration: 0.7,
                  delayChildren: 0.3,
                  staggerChildren: 0.05,
                },
              },
              closed: {
                clipPath: 'inset(10% 50% 90% 50% round 10px)',
                transition: {
                  type: 'spring',
                  bounce: 0,
                  duration: 0.3,
                },
              },
            }}
          >
            {items?.map((item: MenuItemType, idx: number) => {
              itemsRef.current[item.uuid] ||= createRef();
              const itemRef = itemsRef.current[item.uuid]
              return (
                <motion.div
                  key={`menu-item-${item.uuid}-${idx}`}
                  onMouseEnter={event => {
                    cancel();
                    debouncer(() => {
                      renderChildItems(item, event, itemRef);
                    }, 100);
                  }}
                  onMouseLeave={() => {
                    cancel();
                  }}
                  style={{ display: 'grid', width: '100%' }}
                  variants={itemVariants}
                >
                  <MenuItem
                    contained={contained}
                    first={idx === 0}
                    item={item}
                    last={idx === itemsCount - 1}
                    ref={itemRef}
                    small={small}
                  />
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </MenuContent>

      <div id={rootID} />
    </MenuStyled>
  );
}

export default Menu;
