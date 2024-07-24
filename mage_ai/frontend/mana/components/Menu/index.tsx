import Button from '../../elements/Button';
import Grid from '../Grid';
import KeyboardTextGroup from '../../elements/Text/Keyboard/Group';
import React, { createRef, useCallback, useEffect, useMemo, useRef } from 'react';
import Text from '../../elements/Text';
import useCustomEventHandler from '../../events/useCustomEventHandler';
import useDebounce from '@utils/hooks/useDebounce';
import { AnimatePresence, Variants, motion, cubicBezier } from 'framer-motion';
import { CaretRight } from '@mana/icons';
import { HEADER_Z_INDEX } from '@components/constants';
import { LayoutDirectionEnum } from './types';
import { MenuItemType } from './interfaces';
import {
  DividerContainer,
  MenuContent,
  ItemContent,
  DividerStyled,
  MenuContentScroll,
  MenuItemContainerStyled,
  MenuStyled,
  MenuItemStyled,
} from './index.style';
import { UNIT } from '@mana/themes/spaces';
import { PortalProvider, usePortals } from '@context/v2/Portal';
import { EventEnum, KeyEnum } from '@mana/events/enums';

const DEBUG = false;

export type MenuProps = {
  above?: boolean;
  addPortal: (
    level: number,
    portal: React.ReactNode,
    containerRef: React.RefObject<HTMLDivElement>,
  ) => void;
  children?: React.ReactNode;
  contained?: boolean;
  direction?: LayoutDirectionEnum;
  directionPrevious?: LayoutDirectionEnum;
  parentContainers?: HTMLElement;
  event?: MouseEvent | React.MouseEvent<HTMLDivElement>;
  items: MenuItemType[];
  itemsRef: React.RefObject<Record<string, React.RefObject<HTMLDivElement>>>;
  keyboardNavigationItemFilter?: (item: MenuItemType) => boolean;
  level?: number;
  onClose?: (level: number) => void;
  openItems?: {
    column: number;
    row: number;
  }[];
  parentItemRef?: React.RefObject<HTMLDivElement>;
  position?: any;
  rects?: {
    bounding?: any;
    container?: any;
    offset?: any;
  };
  removePortals: (level: number) => void;
  renderChildrenRefs: React.MutableRefObject<
    {
      hideChildren: () => void;
      renderChildren: (event: any, item: MenuItemType) => void;
    }[]
  >;
  small?: boolean;
  standardMenu?: boolean;
  uuid: string;
};

type ItemProps = {
  contained?: boolean;
  defaultOpen?: boolean;
  first?: boolean;
  last?: boolean;
  item: MenuItemType;
  small?: boolean;
  onClickCallback?: () => void;
  handleMouseEnter?: (event: MouseEvent) => void;
  handleMouseLeave?: (event: MouseEvent) => void;
};

function MenuItemBase(
  {
    contained,
    first,
    item,
    last,
    small,
    handleMouseEnter,
    handleMouseLeave,
    defaultOpen,
    onClickCallback,
  }: ItemProps,
  ref: React.RefObject<HTMLDivElement>,
) {
  const timeoutRef = useRef(null);
  const [debouncer, cancel] = useDebounce();
  const { Icon, description, disabled, divider, items, keyboardShortcuts, label, onClick, uuid } =
    item;
  const itemsCount = useMemo(() => items?.length || 0, [items]);

  useEffect(() => {
    if (!defaultOpen && ref.current && ref.current.classList.contains('activated')) {
      timeoutRef.current = setTimeout(() => {
        ref.current?.classList.remove('activated');
      }, 1000);
    }

    // Cleanup on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultOpen]);

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

  const noHover = !onClick && !items?.length ? 'true' : undefined;
  const isHeading = !disabled && !onClick && !items?.length && !divider;

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
            <Text bold={isHeading} secondary={!!noHover} small={small}>
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
          <Text maxWidth={400} secondary small={!small} xsmall={small}>
            {typeof description === 'function' ? description?.() : description}
          </Text>
        )}
      </Grid>
    </MenuItemStyled>
  );

  return (
    <MenuItemContainerStyled
      className={defaultOpen ? 'activated' : ''}
      contained={contained}
      first={first}
      last={last}
      noHover={noHover}
      onMouseEnter={(event: any) => {
        cancel();
        debouncer(() => handleMouseEnter(event as any), 100);
      }}
      onMouseLeave={(event: any) => {
        cancel();
        if (handleMouseLeave) {
          debouncer(() => handleMouseLeave?.(event as any), 100);
        }
      }}
      ref={ref}
    >
      <ItemContent first={first} last={last} noHover={noHover}>
        {!onClick && el}
        {onClick && (
          <Button
            asLink
            disabled={disabled}
            motion
            onClick={e => {
              e.preventDefault();
              onClick?.(e as any, item, () => onClickCallback());
            }}
            plain
            width="100%"
          >
            <motion.div
              variants={{
                closed: {
                  opacity: 1,
                  x: -2,
                },
                open: {
                  opacity: 1,
                  x: 0,
                },
              }}
            >
              {el}
            </motion.div>
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
  children,
  contained,
  direction = LayoutDirectionEnum.RIGHT,
  directionPrevious,
  items,
  itemsRef,
  level,
  openItems,
  parentItemRef,
  position,
  rects,
  removePortals,
  renderChildrenRefs,
  small,
  standardMenu,
  uuid,
}: MenuProps) {
  const directionRef = useRef<LayoutDirectionEnum>(direction);
  const containerRef = useRef(null);
  const containerRectRef = useRef<DOMRect | null>(null);
  const itemExpandedRef = useRef(null);
  const itemsElementRef = useRef(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const rootID = useMemo(() => `menu-item-items-${uuid}`, [uuid]);

  const renderChildItems = useCallback(
    (
      item: MenuItemType,
      itemInnerRef: React.RefObject<HTMLDivElement>,
      opts?: {
        event?: React.MouseEvent<HTMLDivElement>;
        openItems?: MenuProps['openItems'];
      },
    ) => {
      if (itemExpandedRef?.current?.uuid === item?.uuid) return;

      if (opts?.event) {
        opts?.event?.stopPropagation();
        opts?.event?.preventDefault();
      }

      const r = itemInnerRef?.current?.getBoundingClientRect();
      const rect = {
        left: r?.left,
        top: r?.top,
        width: r?.width,
        height: r?.height,
      };

      const nextLevel = level + 1;
      const menuComponent = (
        <Menu
          {...opts}
          above={above}
          addPortal={addPortal}
          contained={contained}
          direction={directionRef.current}
          directionPrevious={direction}
          items={item?.items}
          itemsRef={itemsRef}
          level={nextLevel}
          parentItemRef={itemInnerRef}
          position={rect}
          rects={{
            bounding: rects?.bounding,
            container: rect,
            offset: {
              left: 0,
              top: -rect.height,
            },
          }}
          removePortals={removePortals}
          renderChildrenRefs={renderChildrenRefs}
          small
          standardMenu={standardMenu}
          uuid={`${uuid}-${item.uuid}`}
        />
      );

      removePortals(nextLevel);

      // Open the selected submenu
      addPortal(nextLevel, menuComponent, containerRef);

      items?.forEach(item2 => {
        const iref = itemsRef?.current?.[item2?.uuid];
        if (item2?.uuid !== item?.uuid) {
          iref?.current?.classList?.remove('activated');
        } else {
          iref?.current?.classList?.add('activated');
        }
      });

      itemExpandedRef.current = item;
    },
    [
      standardMenu,
      uuid,
      addPortal,
      removePortals,
      renderChildrenRefs,
      above,
      contained,
      directionRef,
      rects,
      direction,
      itemsRef,
      level,
      items,
    ],
  );

  const itemsCount = useMemo(() => items?.length || 0, [items]);

  const hideChildren = useCallback(() => {
    itemExpandedRef.current = null;
    removePortals(level + 1);
  }, [level, removePortals]);

  useEffect(() => {
    const computedStyle =
      typeof window !== 'undefined' && window.getComputedStyle(containerRef.current);

    if (computedStyle && containerRef.current) {
      const { container, bounding, offset } = rects ?? {};
      const menu = containerRef?.current?.getBoundingClientRect();
      const pos = {
        height: position?.height ?? 0,
        left: position?.left ?? 0,
        top: position?.top ?? 0,
        width: position?.width ?? 0,
      };

      DEBUG && console.log(
        0,
        pos,
        container,
        bounding,
        offset,
        menu,
      )

      const padding = UNIT;
      const right = bounding.left + bounding.width;
      const bottom = bounding.top + bounding.height;

      DEBUG && console.log(1, right, bottom)

      const hmenu = menu?.height ?? 0;
      const wmenu = menu?.width ?? 0;

      DEBUG && console.log(2, hmenu, wmenu)

      let xoff = offset?.left ?? 0;
      let xoffi = 0;

      let yoff = offset?.top ?? 0;
      let yoffi = 0;

      DEBUG && console.log(3, xoff, yoff, direction)

      if (contained) {
        if (above) {
          yoffi -= (hmenu + (container?.height ?? 0));
        } else {
          yoffi += (container?.height ?? 0);
        }

        if (LayoutDirectionEnum.LEFT === direction) {
          xoffi -= (wmenu - (container?.width ?? 0));
        } else if (level >= 1) {
          xoffi += (container?.width ?? 0) + padding;
        }

        DEBUG && console.log(4, xoffi)
      } else {
        if (LayoutDirectionEnum.LEFT === direction) {
          xoffi -= wmenu ?? 0;
        } else if (level >= 1) {
          xoffi += (container?.width ?? 0) + padding;
        }

        DEBUG && console.log(4, xoffi)

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

      }

      DEBUG && console.log(5, xoffi)
      xoff += xoffi;
      DEBUG && console.log(6, xoff)

      yoff += container?.height ?? 0;
      yoff += level === 0 ? padding / 2 : 0;

      DEBUG && console.log(7, yoff)

      pos.left += xoff;
      pos.top += yoff;

      DEBUG && console.log(8, pos)

      const ymax = window.innerHeight;
      if (pos.top + hmenu > ymax) {
        pos.top = (ymax - hmenu);
      }

      DEBUG && console.log(9, pos)

      if (pos.top < 0) {
        pos.top = 0;
      }

      DEBUG && console.log(10, pos)

      containerRef.current.style.left = `${pos.left}px`;
      containerRef.current.style.top = `${pos.top}px`;
      containerRef.current.style.opacity = '1';
      containerRef.current.style.visibility = 'visible';
      containerRef.current.style.zIndex = `${HEADER_Z_INDEX + 100}`;

      containerRectRef.current = containerRef.current.getBoundingClientRect();

      DEBUG && console.log(11, containerRectRef.current)

      if (openItems?.length >= 1) {
        const row = openItems?.[0]?.row;
        const openItem = items?.[row];
        if (openItem) {
          renderChildItems(openItem, itemsRef?.current?.[openItem?.uuid], {
            openItems: openItems.slice(1),
          });
        }
      }

      renderChildrenRefs.current[level] = {
        hideChildren,
        renderChildren: (event, item) => {
          renderChildItems(item, itemsRef?.current?.[item?.uuid], {
            event: event as any,
          });
        },
      };
    }

    const timeout = timeoutRef.current;

    return () => {
      clearTimeout(timeout);

      itemsElementRef.current = null;
      itemExpandedRef.current = null;
      timeoutRef.current = null;
    };
  }, [
    contained,
    rects,
    direction,
    above,
    position,
    level,
    hideChildren,
    directionPrevious,
    openItems,
    items,
    itemsRef,
    renderChildItems,
    renderChildrenRefs,
    rootID,
    standardMenu,
    uuid,
  ]);

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
        animate="open"
        initial={level > 0 ? 'open' : 'closed'}
        variants={{
          closed: {
            opacity: 0.75,
            scale: 0.95,
          },
          open: {
            opacity: 1,
            scale: 1,
            transition: {
              duration: 0.03,
              ease: 'linear',
            },
          },
        }}
      >
        <MenuContentScroll
          animate="open"
          initial={level === 1 ? 'closed' : 'open'}
          variants={{
            open: {
              transition: {
                delayChildren: 0.02,
                duration: 0.04,
                ease: 'linear',
                staggerChildren: 0.04,
              },
            },
          }}
        >
          {itemsCount >= 1 &&
            items?.map((item: MenuItemType, idx: number) => {
              itemsRef.current[item.uuid] ||= createRef();
              const itemRef = itemsRef.current[item.uuid];

              return (
                <div
                  key={`menu-item-${item.uuid}-${idx}`}
                  style={{ display: 'grid', width: '100%' }}
                >
                  <MenuItem
                    contained={contained}
                    defaultOpen={openItems?.[0]?.row === idx}
                    first={idx === 0}
                    handleMouseEnter={event => {
                      hideChildren();
                      if (item?.items?.length >= 1) {
                        renderChildItems(item, itemRef, {
                          event: event as any,
                        });
                      }
                    }}
                    item={item}
                    last={idx === itemsCount - 1}
                    onClickCallback={() => removePortals(0)}
                    ref={itemRef}
                    small={small}
                  />
                </div>
              );
            })}
        </MenuContentScroll>
      </MenuContent>

      {children}
      {/* {!parentItemsElementRef?.current && <div id={rootID} ref={itemsElementRef} />}
      {parentItemsElementRef && portal && createPortal(portal, parentItemsElementRef.current)} */}
    </MenuStyled>
  );
}

function MenuController({
  items,
  keyboardNavigationItemFilter,
  onClose,
  portalRef,
  ...props
}: MenuProps & {
  portalRef: React.RefObject<HTMLDivElement>;
}) {
  const timeoutRef = useRef(null);
  const triggeredOnClickRef = useRef(false);
  const dispatchEventRef = useRef(null);
  const itemsRef = useRef<Record<string, React.RefObject<HTMLDivElement>>>({});
  const containerRefs = useRef<Record<string, React.RefObject<HTMLDivElement>>>({});
  const renderChildrenRefs = useRef<
    {
      hideChildren: () => void;
      renderChildren: (event: any, item: MenuItemType) => void;
    }[]
  >([]);
  const { addPortal, removePortalsFromLevel } = usePortals();

  const removePortals = useCallback(
    (level: number) => {
      removePortalsFromLevel(level);
      onClose && onClose?.(level);
      delete containerRefs.current[level];
    },
    [onClose, removePortalsFromLevel],
  );

  const addPortalHandler = useCallback(
    (level: number, element: React.ReactNode, containerRef: React.RefObject<HTMLDivElement>) => {
      containerRefs.current[level] = containerRef;
      addPortal(level, element);
    },
    [addPortal],
  );

  const handleDocumentClick = useCallback(
    (event: MouseEvent) => {
      const el = event.target as Node;
      const contains = [
        ...(Object.values(containerRefs?.current ?? {}) ?? []),
        ...(Object.values(itemsRef?.current ?? {}) ?? []),
      ]?.some(ref => ref?.current?.contains(el));

      if (!contains) {
        event.stopPropagation();
        removePortals(0);
        onClose && onClose?.(0);
      }
    },
    [onClose, removePortals],
  );

  const handleKeyDown = useCallback(
    (event: any) => {
      const {
        position,
        previousPosition,
        // previousTarget,
        // target,
      } = event?.detail;
      // const item = target as MenuItemType;
      // const itemPrevious = previousTarget as MenuItemType;

      const getTargets = (pos: number[]) => {
        let item = null;
        let itemsInner = [...(items ?? [])].filter(keyboardNavigationItemFilter);

        pos?.forEach((row: number) => {
          item = itemsInner?.[row];
          itemsInner = [...(item?.items ?? [])].filter(keyboardNavigationItemFilter);
        });

        return [item, itemsInner];
      };
      const [target] = getTargets(position);
      const [previousTarget] = getTargets(previousPosition);
      const item = target as MenuItemType;
      const itemPrevious = previousTarget as MenuItemType;

      if (KeyEnum.ESCAPE === event.key) {
        removePortals(0);
        onClose && onClose?.(0);
      } else if (KeyEnum.ENTER === event.key && item && item?.onClick) {
        if (!triggeredOnClickRef.current) {
          // console.log(item, position)
          triggeredOnClickRef.current = true;
          // console.log(position, previousPosition, item)

          // Need to add this or else useMutate can’t automatically add loading state.
          event.preventDefault();
          item?.onClick(
            {
              ...event,
              target: itemsRef?.current?.[item?.uuid]?.current,
            },
            item,
          );
          removePortals(0);
          // clearTimeout(timeoutRef.current);
          // timeoutRef.current = setTimeout(() => {
          //   triggeredOnClickRef.current = false;
          // }, 100);
        }
      } else if (item?.uuid !== itemPrevious?.uuid) {
        const el = itemsRef?.current?.[item?.uuid];
        const el2 = itemsRef?.current?.[previousTarget?.uuid];
        if (el?.current) {
          el?.current?.focus();
          el?.current?.classList?.add('hovering');
        }
        if (el2?.current) {
          el2?.current?.classList?.remove('hovering');
        }

        const { hideChildren, renderChildren } =
          renderChildrenRefs?.current?.[position?.length - 1] ?? {};

        if (item?.items?.length >= 1) {
          if (KeyEnum.ARROWLEFT === event.key) {
            hideChildren?.();
          } else if (renderChildren) {
            renderChildren(event, item);
          }
        } else if (itemPrevious?.items?.length >= 1) {
          hideChildren?.();
        }
      }
    },
    [items, keyboardNavigationItemFilter, onClose, removePortals],
  );

  dispatchEventRef.current = useCustomEventHandler(portalRef, {
    [EventEnum.KEYDOWN]: handleKeyDown,
  }).dispatchCustomEvent;

  useEffect(() => {
    document.addEventListener('click', handleDocumentClick);
    const timeout = timeoutRef.current;

    return () => {
      containerRefs.current = {};
      itemsRef.current = {};
      triggeredOnClickRef.current = false;

      document.removeEventListener('click', handleDocumentClick);
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleDocumentClick]);

  return (
    <Menu
      {...props}
      addPortal={addPortalHandler}
      items={items}
      itemsRef={itemsRef}
      level={0}
      removePortals={removePortals}
      renderChildrenRefs={renderChildrenRefs}
    >
      <div ref={portalRef} />
    </Menu>
  );
}

function MenuRoot(props: MenuProps) {
  const portalRef = useRef<HTMLDivElement>(null);

  return (
    <PortalProvider containerRef={portalRef}>
      <AnimatePresence>
        <MenuController {...props} portalRef={portalRef} />
      </AnimatePresence>
    </PortalProvider>
  );
}

export default MenuRoot;
