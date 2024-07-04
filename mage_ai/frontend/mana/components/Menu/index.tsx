import React, { createRef, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import update from 'immutability-helper';
import { ThemeContext, ThemeProvider } from 'styled-components';
import { createRoot } from 'react-dom/client';
import { Variants, motion } from 'framer-motion';

import { LayoutDirectionEnum } from './types';
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
import { ClientEventType, RectType } from '@mana/shared/interfaces';
import { getAbsoluteRect } from '@mana/shared/utils';
import { addRects, getRectDiff } from '@components/v2/Canvas/utils/rect';
import { PortalProvider, usePortals } from '@context/v2/Portal';

const DEBUG = true;

const itemVariants: Variants = {
  open: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 24 },
  },
  closed: { opacity: 0, y: 20, transition: { duration: 0.2 } },
};

export type MenuProps = {
  above?: boolean;
  children?: React.ReactNode;
  contained?: boolean;
  direction?: LayoutDirectionEnum;
  parentContainers?: HTMLElement;
  openAtPosition?: {
    left: number;
    top: number;
  };
  event?: MouseEvent | React.MouseEvent<HTMLDivElement>;
  items: MenuItemType[];
  level?: number;
  onClose?: (level: number) => void;
  position?: RectType;
  rects?: {
    bounding?: RectType;
    container?: RectType;
    offset?: RectType;
  };
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
  handleMouseEnter?: (event: MouseEvent) => void;
  handleMouseLeave?: (event: MouseEvent) => void;
};

function MenuItemBase({
  contained, first, item, last, small,
  handleMouseEnter, handleMouseLeave
}: ItemProps,
  ref: React.Ref<HTMLDivElement>
) {
  const [debouncer, cancel] = useDebounce();
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
      onMouseEnter={(event) => {
        cancel();
        debouncer(() => handleMouseEnter(event), 100);
      }}
      onMouseLeave={(event) => {
        cancel();
        if (handleMouseLeave) {
          debouncer(() => handleMouseLeave?.(event), 100);
        }
      }}
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
  above,
  contained,
  direction = LayoutDirectionEnum.RIGHT,
  items,
  level,
  openAtPosition,
  children,
  onClose,
  position,
  rects,
  small,
  standardMenu,
  uuid,
}: MenuProps) {
  const themeContext = useContext(ThemeContext);
  const containerRef = useRef(null);
  const containerRectRef = useRef<DOMRect | null>(null);
  const itemExpandedRef = useRef(null);
  const itemsElementRef = useRef(null);
  const itemsRootRef = useRef(null);
  const itemsRef = useRef<Record<string, React.RefObject<HTMLDivElement>>>({});
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const rootID = useMemo(() => `menu-item-items-${uuid}`, [uuid]);
  const offsetRef = useRef<RectType>({ left: 0, top: 0, width: 0, height: 0 });
  const [portal, setPortal] = useState(null);
  const { addPortal, removePortalsFromLevel } = usePortals();

  const renderChildItems = useCallback(
    (
      item: MenuItemType,
      event: React.MouseEvent<HTMLDivElement>,
      itemInnerRef: React.RefObject<HTMLDivElement>,
    ) => {
      if (itemExpandedRef?.current?.uuid === item?.uuid) return;

      event.stopPropagation();
      event.preventDefault();

      const r = itemInnerRef?.current?.getBoundingClientRect();
      const rect = {
        left: r?.left,
        top: r?.top,
        width: r?.width,
        height: r?.height,
      }

      const nextLevel = level + 1;
      const menuComponent = (
        <Menu
          above={above}
          contained={contained}
          direction={direction}
          event={event}
          items={item?.items}
          level={nextLevel}
          position={rect}
          rects={{
            bounding: rects?.bounding,
            container: rect,
            offset: {
              left: 0,
              top: -rect.height,
            },
          }}
          small
          standardMenu={standardMenu}
          uuid={`${uuid}-${item.uuid}`}
        />
      );

      // Close submenus deeper than the current level
      removePortalsFromLevel(nextLevel);

      // Open the selected submenu
      addPortal(nextLevel, menuComponent);

      // Why are we appending?
      // if (parentItemsElementRef?.current) {
      //   setPortal(menuComponent);
      //   return;
      // }

      // const element = event?.target as HTMLElement;
      // const rect = element?.getBoundingClientRect() || ({} as DOMRect);
      // const rectContainer = containerRef?.current?.getBoundingClientRect() || ({} as DOMRect);

      // Calculate the mouse position relative to the element
      // const paddingHorizontal = rect?.left - rectContainer?.left;
      // 4px for the 4 borders: 2 from the parent and 2 from the child.
      // const x = rectContainer?.left + rectContainer?.width - (rect?.left + paddingHorizontal + 4);
      // const y = rect?.top - rectContainer?.top - 2 * (rect?.height - element?.clientHeight);

      // if (!itemsRootRef?.current) {
      //   const element = parentItemsElementRef?.current ?? itemsElementRef?.current;
      //   itemsRootRef.current = createRoot(element as HTMLElement);
      // }

      // if (!itemsRootRef?.current) {
      //   console.error('Cannot update an unmounted root', uuid);
      //   return;
      // }

      // if (!itemsRootRef?.current) return;

      // itemsRootRef?.current.render(item?.items?.length >= 1
      //   ? (
      //     <React.StrictMode>
      //       <DeferredRenderer idleTimeout={1}>
      //         <ThemeProvider theme={themeContext}>
      //           {menuComponent}
      //         </ThemeProvider>
      //       </DeferredRenderer>
      //     </React.StrictMode>
      //   )
      //   : null
      // );

      itemExpandedRef.current = item;
    },
    [standardMenu, themeContext, uuid,
      above, contained, direction, rects,
      level,
    ],
  );

  const itemsCount = useMemo(() => items?.length || 0, [items]);

  const hideChildren = useCallback(() => {
    if (itemExpandedRef.current) {
      itemExpandedRef.current = null;
      itemsRootRef?.current?.render(null)
    }
  }, []);

  const removeChildren = useCallback((exceptUUID?: string) => {
    if (exceptUUID && itemExpandedRef.current === exceptUUID) return;

    // Using a timeout to unmount after the current render cycle
    timeoutRef.current = setTimeout(() => {
      const root = itemsRootRef.current;
      root?.unmount();

      const element = itemsElementRef.current;
      element && element.remove();
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle outside click
  const handleDocumentClick = useCallback((event: MouseEvent) => {
    const el = event.target as node;
    const contains = [
      containerRef,
      ...(Object.values(itemsRef?.current ?? {}) ?? []),
    ]?.some((ref) => ref?.current?.contains(el));

    if (!contains) {
      removePortalsFromLevel(0);
      onClose && onClose?.(0);
    }
  }, [onClose, removePortalsFromLevel]);

  useEffect(() => {
    const computedStyle =
      typeof window !== 'undefined' && window.getComputedStyle(containerRef.current);

    if (computedStyle && containerRef.current) {
      const {
        container,
        bounding,
        offset,
      } = rects ?? {};
      const menu = containerRef?.current?.getBoundingClientRect();
      const pos = {
        height: position?.height ?? 0,
        left: position?.left ?? 0,
        top: position?.top ?? 0,
        width: position?.width ?? 0,
      };

      // DEBUG && [
      //   console.log('------------------------------------------------------------------'),
      //   console.log(uuid),
      //   console.log('box', bounding.left, bounding.top, bounding.width, bounding.height),
      //   console.log('container', container.left, container.top, container.width, container.height),
      //   console.log('offset', offset.left, offset.top, offset.width, offset.height),
      //   console.log('menu', menu.left, menu.top, menu.width, menu.height),
      // ];

      const padding = UNIT;
      const right = bounding.left + bounding.width;
      const bottom = bounding.top + bounding.height;

      const hmenu = menu?.height ?? 0;
      const wmenu = menu?.width ?? 0;

      let xoff = offset?.left ?? 0;
      let yoff = offset?.top ?? 0;
      // DEBUG && [
      //   console.log('offset.0', xoff, yoff),
      //   console.log('position.0', position.left, position.top),
      // ];


      if (contained) {
        // if (LayoutDirectionEnum.LEFT === direction) {
        //   xoff -= (wmenu - (container?.width ?? 0));
        // } else {
        //   xoff += (wmenu - (container?.width ?? 0));
        // }

        // if (above) {
        //   yoff -= (hmenu + (container?.height ?? 0));
        // } else {
        //   yoff += (container?.height ?? 0);
        // }
      } else {
        if (above) {

        } else {
          if (LayoutDirectionEnum.LEFT === direction) {
            xoff -= (wmenu ?? 0);
          } else {
            xoff += container?.width ?? 0;
          }
          xoff += padding * (LayoutDirectionEnum.LEFT === direction ? -1 : 1);
          yoff += container?.height ?? 0;
        }
      }

      pos.left += xoff;
      pos.top += yoff;
      // DEBUG && [
      //   console.log('offset.1', xoff, yoff),
      //   console.log('position.1', position.left, position.top),
      // ];

      // if (position.left >= right) {
      //   position.left = container.left;
      // }
      // if (position.top >= bottom) {
      //   position.top = (container.top) - (yoff - container.height);
      // }

      // DEBUG && [
      //   console.log('position.2', pos.left, pos.top),
      // ];

      containerRef.current.style.left = `${pos.left}px`;
      containerRef.current.style.top = `${pos.top}px`;
      containerRef.current.style.opacity = '1';
      containerRef.current.style.visibility = 'visible';
      containerRef.current.style.zIndex = `${HEADER_Z_INDEX + 100}`;

      containerRectRef.current = containerRef.current.getBoundingClientRect();
    }

    document.addEventListener('click', handleDocumentClick);

    const timeout = timeoutRef.current;

    return () => {
      clearTimeout(timeout);

      itemsElementRef.current = null;
      itemExpandedRef.current = null;
      timeoutRef.current = null;

      document.removeEventListener('click', handleDocumentClick);
    };
  }, [contained, handleDocumentClick, openAtPosition, rects, direction, above, uuid, position,
    rootID, standardMenu, uuid, removeChildren]);

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
                  style={{ display: 'grid', width: '100%' }}
                  variants={itemVariants}
                >
                  <MenuItem
                    handleMouseEnter={(event) => {
                      hideChildren();
                      if (item?.items?.length >= 1) {
                        renderChildItems(item, event as any, itemRef);
                      }
                    }}
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

      {children}
      {/* {!parentItemsElementRef?.current && <div id={rootID} ref={itemsElementRef} />}
      {parentItemsElementRef && portal && createPortal(portal, parentItemsElementRef.current)} */}
    </MenuStyled>
  );
}

function MenuRoot(props: MenuProps) {
  const portalRef = useRef<HTMLDivElement>(null);
  return (
    <PortalProvider containerRef={portalRef}>
      <Menu {...props} level={0}>
        <div ref={portalRef} />
      </Menu>
    </PortalProvider >
  )
}

export default MenuRoot;
