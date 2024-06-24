import React, { useCallback, useContext, useMemo, useRef } from 'react';
import { ThemeContext, ThemeProvider } from 'styled-components';
import { createRoot } from 'react-dom/client';

import Button from '@mana/elements/Button';
import DeferredRenderer from '@mana/components/DeferredRenderer';
import Grid from '@mana/components/Grid';
import KeyboardTextGroup from '@mana/elements/Text/Keyboard/Group';
import Text from '@mana/elements/Text';
import icons from '@mana/icons';
import useDebounce from '@utils/hooks/useDebounce';
import { HEADER_Z_INDEX } from '@components/constants';
import { MenuItemType } from './interfaces';
import { DividerStyled, MenuItemContainerStyled, MenuStyled, MenuItemStyled, MENU_ITEM_HEIGHT, MENU_MIN_WIDTH } from './index.style';
import { Row } from '@mana/components/Container';
import { UNIT } from '@mana/themes/spaces';

const { CaretRight } = icons;

type MenuProps = {
  boundingContainer?: {
    width: number;
    x: number;
    y: number;
  };
  contained?: boolean;
  coordinates?: {
    x: number;
    y: number;
  };
  event?: MouseEvent | React.MouseEvent<HTMLDivElement>;
  items: MenuItemType[];
  small?: boolean;
  uuid: string;
};

type ItemProps = {
  contained?: boolean;
  first?: boolean;
  last?: boolean;
  item: MenuItemType;
  small?: boolean;
};

function MenuItem({ contained, first, item, last, small }: ItemProps) {
  const { Icon, description, divider, items, keyboardShortcuts, label, onClick, uuid } = item;
  const itemsCount = useMemo(() => items?.length || 0, [items]);

  if (divider) {
    return <MenuItemContainerStyled><DividerStyled /></MenuItemContainerStyled>;
  }

  const before = Icon ? <Icon size={small ? 12 : undefined} /> : undefined;

  return (
    <Button
      asLink
      onClick={onClick}
      plain
    >
      <MenuItemContainerStyled
        contained={contained}
        first={first}
        last={last}
      >
        <MenuItemStyled
          first={first}
          last={last}
        >
          <Grid rowGap={4}>
            <Grid
              alignItems="center"
              columnGap={16}
              justifyContent="space-between"
              templateColumns={[
                '1fr',
                'auto',
              ].filter(Boolean).join(' ')}
              templateRows="1fr"
            >
              <Grid
                columnGap={4}
                templateColumns={[
                  before && 'auto',
                  '1fr',
                ].filter(Boolean).join(' ')}
              >
                {before}
                <Text small={small}>{label?.() || uuid}</Text>
              </Grid>

              <Grid
                columnGap={4}
                templateColumns={[
                  keyboardShortcuts && 'auto',
                  itemsCount >= 1 && 'auto',
                ].filter(Boolean).join(' ')}
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
      </MenuItemContainerStyled>
    </Button>
  );
}

function Menu({ boundingContainer, contained, coordinates, event, items, small, uuid }: MenuProps) {
  const themeContext = useContext(ThemeContext);
  const containerRef = useRef(null);
  const itemExpandedRef = useRef(null);

  const [debouncer, cancel] = useDebounce();

  const { x: left, y: top } = useMemo(() => {
    const x = typeof coordinates !== 'undefined' ? coordinates?.x : event?.pageX;
    const y = typeof coordinates !== 'undefined' ? coordinates?.y : event?.pageY;

    const { width: widthContainer, x: xContainer } = boundingContainer || { width: 0, x: 0, y: 0 };

    let xFinal = x + UNIT;
    if (x + MENU_MIN_WIDTH >= xContainer + widthContainer) {
      xFinal = xContainer + widthContainer - (MENU_MIN_WIDTH + UNIT);
    }
    if (xFinal < 0) {
      xFinal = 0;
    }

    const element = event?.target as HTMLElement;
    const rect = element?.getBoundingClientRect() || ({} as DOMRect);
    let yFinal = y + UNIT / 2;
    const menuHeight = MENU_ITEM_HEIGHT * items.length;
    if (y + menuHeight >= window.innerHeight) {
      yFinal = y - menuHeight - (rect?.height || 0);
    }

    return {
      x: xFinal,
      y: yFinal,
    };
  }, [boundingContainer, coordinates, event, items]);

  const itemsRootRef = useRef(null);
  const rootID = useMemo(() => `menu-item-items-${uuid}`, [uuid]);

  const renderItems = useCallback(
    (item: MenuItemType, event: React.MouseEvent<HTMLDivElement>) => {
      if (!item?.items?.length || itemExpandedRef?.current?.uuid === item?.uuid) {
        return;
      }

      event.stopPropagation();
      event.preventDefault();

      if (!itemsRootRef?.current) {
        const node = document.getElementById(rootID);
        itemsRootRef.current = createRoot(node as HTMLElement);
      }

      const element = event?.target as HTMLElement;
      const rect = element?.getBoundingClientRect() || ({} as DOMRect);
      const rectContainer = containerRef?.current?.getBoundingClientRect() || ({} as DOMRect);

      // Calculate the mouse position relative to the element
      const paddingHorizontal = rect?.left - rectContainer?.left;
      // 4px for the 4 borders: 2 from the parent and 2 from the child.
      const x = rectContainer?.left + rectContainer?.width - (rect?.left + paddingHorizontal + 4);
      const y = rect?.top - rectContainer?.top - 2 * (rect?.height - element?.clientHeight);

      itemsRootRef.current.render(
        <React.StrictMode>
          <DeferredRenderer idleTimeout={1}>
            <ThemeProvider theme={themeContext}>
              <Menu
                boundingContainer={boundingContainer}
                contained
                coordinates={{ x, y }}
                event={event}
                items={item?.items}
                small
                uuid={`${uuid}-${item.uuid}`}
              />
            </ThemeProvider>
          </DeferredRenderer>
        </React.StrictMode>,
      );

      itemExpandedRef.current = item;
    },
    [boundingContainer, rootID, themeContext, uuid],
  );

  const itemsCount = useMemo(() => items?.length || 0, [items]);

  return (
    <MenuStyled
      contained={contained}
      left={left}
      ref={containerRef}
      top={top}
      zIndex={HEADER_Z_INDEX + 100}
    >
      {itemsCount >= 1 && (
        <>
          {items?.map((item: MenuItemType, idx: number) => (
            <div
              key={`menu-item-${item.uuid}-${idx}`}
              onMouseEnter={event => {
                cancel();
                debouncer(() => renderItems(item, event), 100);
              }}
              onMouseLeave={() => {
                cancel();
              }}
              style={{ display: 'grid', width: '100%' }}
            >
              <MenuItem contained={contained} first={idx === 0} item={item} last={idx === itemsCount - 1} small={small} />
            </div>
          ))}

          <div id={rootID} />
        </>
      )}
    </MenuStyled>
  );
}

export default Menu;
