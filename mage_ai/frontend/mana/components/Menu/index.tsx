import Button from '../../elements/Button';
import DeferredRenderer from '../DeferredRenderer';
import Grid from '../Grid';
import KeyboardTextGroup from '../../elements/Text/Keyboard/Group';
import React, { createRef, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import Text from '../../elements/Text';
import update from 'immutability-helper';
import useDebounce, { DebouncerType, CancelType } from '@utils/hooks/useDebounce';
import { CaretRight } from '@mana/icons';
import { HEADER_Z_INDEX } from '@components/constants';
import { LayoutDirectionEnum } from './types';
import { MenuItemType } from './interfaces';
import { ThemeContext, ThemeProvider } from 'styled-components';
import { AnimatePresence, Variants, motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { createRoot } from 'react-dom/client';
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
  addPortal: (level: number, portal: React.ReactNode, containerRef: React.RefObject<HTMLDivElement>) => void;
  children?: React.ReactNode;
  contained?: boolean;
  direction?: LayoutDirectionEnum;
  directionPrevious?: LayoutDirectionEnum;
  parentContainers?: HTMLElement;
  event?: MouseEvent | React.MouseEvent<HTMLDivElement>;
  items: MenuItemType[];
  itemsRef: React.RefObject<Record<string, React.RefObject<HTMLDivElement>>>;
  level?: number;
  onClose?: (level: number) => void;
  position?: RectType;
  rects?: {
    bounding?: RectType;
    container?: RectType;
    offset?: RectType;
  };
  removePortals: (level: number) => void;
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
              {(typeof label === 'function' ? label?.() : label) || uuid}
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
          <Text maxWidth={400} muted small={!small} xsmall={small}>
            {typeof description === 'function' ? description?.() : description}
          </Text >
        )}
      </Grid>
    </MenuItemStyled>
  );

  return (
    <MenuItemContainerStyled
      onMouseEnter={(event) => {
        cancel();
        debouncer(() => handleMouseEnter(event as any), 100);
      }}
      onMouseLeave={(event) => {
        cancel();
        if (handleMouseLeave) {
          debouncer(() => handleMouseLeave?.(event as any), 100);
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
              onClick?.(e as ClientEventType, item);
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
  addPortal,
  contained,
  direction = LayoutDirectionEnum.RIGHT,
  directionPrevious,
  items,
  itemsRef,
  level,
  children,
  position,
  rects,
  removePortals,
  small,
  standardMenu,
  uuid,
}: MenuProps) {
  const directionRef = useRef<LayoutDirectionEnum>(direction);
  const containerRef = useRef(null);
  const containerRectRef = useRef<DOMRect | null>(null);
  const itemExpandedRef = useRef(null);
  const itemsElementRef = useRef(null);
  const itemsRootRef = useRef(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const rootID = useMemo(() => `menu-item-items-${uuid}`, [uuid]);

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
          addPortal={addPortal}
          contained={contained}
          direction={directionRef.current}
          directionPrevious={direction}
          event={event}
          items={item?.items}
          itemsRef={itemsRef}
          level={nextLevel}
          position={rect}
          removePortals={removePortals}
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

      removePortals(nextLevel);

      // Open the selected submenu
      addPortal(nextLevel, menuComponent, containerRef);

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
    [standardMenu, uuid, addPortal, removePortals,
      above, contained, directionRef, rects, direction, itemsRef,
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

      const padding = UNIT;
      const right = bounding.left + bounding.width;
      const bottom = bounding.top + bounding.height;

      const hmenu = menu?.height ?? 0;
      const wmenu = menu?.width ?? 0;

      let xoff = offset?.left ?? 0;
      let yoff = offset?.top ?? 0;

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
          let xoffi = 0;
          if (LayoutDirectionEnum.LEFT === direction) {
            xoffi -= wmenu ?? 0;
          } else {
            if (level >= 1) {
              xoffi += (container?.width ?? 0) + padding;
            } else {
            }
          }

          if (pos.left + xoffi <= 0) {
            if (LayoutDirectionEnum.LEFT === direction) {
              if (level === 0) {
                xoffi = -(container?.width ?? 0);
              } else {
                xoffi += wmenu + (container?.width ?? 0) + padding;
              }

              directionRef.current = LayoutDirectionEnum.RIGHT;
            }
          }

          xoff += xoffi;

          yoff += container?.height ?? 0;
          yoff += level === 0 ? (padding / 2) : 0;
        }
      }

      pos.left += xoff;
      pos.top += yoff;

      containerRef.current.style.left = `${pos.left}px`;
      containerRef.current.style.top = `${pos.top}px`;
      containerRef.current.style.opacity = '1';
      containerRef.current.style.visibility = 'visible';
      containerRef.current.style.zIndex = `${HEADER_Z_INDEX + 100}`;

      containerRectRef.current = containerRef.current.getBoundingClientRect();
    }

    const timeout = timeoutRef.current;

    return () => {
      clearTimeout(timeout);

      itemsElementRef.current = null;
      itemExpandedRef.current = null;
      timeoutRef.current = null;
    };
  }, [contained, rects, direction, above, uuid, position, level,
    directionPrevious,
    rootID, standardMenu, uuid, removeChildren]);

  return (
    <MenuStyled
      animate={{ opacity: 1 }}
      contained={contained ? 'true' : undefined}
      exit={{ opacity: 0 }} // This isn’t doing anything
      initial={{ opacity: 1 }}
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
        exit={{ opacity: 0 }} // This isn’t doing anything
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
              const itemRef = itemsRef.current[item.uuid];

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

function MenuController({ children, onClose, ...props }: MenuProps) {
  const itemsRef = useRef<Record<string, React.RefObject<HTMLDivElement>>>({});
  const containerRefs = useRef<Record<string, React.RefObject<HTMLDivElement>>>({});
  const { addPortal, removePortalsFromLevel } = usePortals();

  const removePortals = useCallback((level: number) => {
    removePortalsFromLevel(level);
    onClose && onClose?.(level);
    delete containerRefs.current[level];
  }, [onClose, removePortalsFromLevel]);

  const addPortalHandler = useCallback((
    level: number,
    element: React.ReactNode,
    containerRef: React.RefObject<HTMLDivElement>,
  ) => {
    containerRefs.current[level] = containerRef;
    addPortal(level, element);
  }, [addPortal]);

  const handleDocumentClick = useCallback((event: MouseEvent) => {
    const el = event.target as Node;
    const contains = [
      ...(Object.values(containerRefs?.current ?? {}) ?? []),
      ...(Object.values(itemsRef?.current ?? {}) ?? []),
    ]?.some((ref) => ref?.current?.contains(el));

    if (!contains) {
      event.stopPropagation();
      removePortals(0);
      onClose && onClose?.(0);
    }
  }, [onClose, removePortals]);

  useEffect(() => {
    document.addEventListener('click', handleDocumentClick);

    return () => {
      containerRefs.current = {};
      itemsRef.current = {};
      document.removeEventListener('click', handleDocumentClick);
    };
  }, [handleDocumentClick]);

  return (
    <Menu
      {...props}
      addPortal={addPortalHandler}
      itemsRef={itemsRef}
      level={0}
      removePortals={removePortals}
    >
      {children}
    </Menu>
  );
}

function MenuRoot(props: MenuProps) {
  const portalRef = useRef<HTMLDivElement>(null);

  return (
    <PortalProvider containerRef={portalRef}>
      <AnimatePresence >
        <MenuController {...props}>
          <div ref={portalRef} />
        </MenuController>
      </AnimatePresence >
    </PortalProvider >
  )
}

export default MenuRoot;
