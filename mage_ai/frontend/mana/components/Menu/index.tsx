import React, { useCallback, useContext, useMemo, useRef } from 'react';
import { ThemeContext, ThemeProvider } from 'styled-components';
import { createRoot } from 'react-dom/client';

import DeferredRenderer from '@mana/components/DeferredRenderer';
import Button from '@mana/elements/Button';
import Divider from '@mana/elements/Divider';
import KeyboardTextGroup from '@mana/elements/Text/Keyboard/Group';
import Text from '@mana/elements/Text';
import { Row } from '@mana/components/Container';
import Grid from '@mana/components/Grid';
import { MenuStyled, MENU_ITEM_HEIGHT, MENU_MIN_WIDTH } from './index.style';
import { HEADER_Z_INDEX } from '@components/constants';
import { UNIT } from '@mana/themes/spaces';
import icons from '@mana/icons';
import useDebounce from '@utils/hooks/useDebounce';
import { MenuItemType } from './types';

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
  item: MenuItemType;
  small?: boolean;
};

function MenuItem({ item, small }: ItemProps) {
  const { Icon, description, divider, items, keyboardShortcuts, label, onClick, uuid } = item;
  const itemsCount = useMemo(() => items?.length || 0, [items]);

  if (divider) {
    return <Divider compact={small} />;
  }

  return (
    <Button
      Icon={Icon ? () => <Icon size={small ? 16 : undefined} /> : undefined}
      asLink
      onClick={onClick}
    >
      <Grid rowGap={4}>
        <Grid
          alignItems="center"
          autoFlow="column"
          justifyContent="space-between"
          templateRows="1fr"
        >
          <Text small={small}>{label?.() || uuid}</Text>

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

        {description && (
          <Text muted small={!small} xsmall={small}>
            {description?.()}
          </Text>
        )}
      </Grid>
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
      const x = rectContainer?.left + rectContainer?.width - (rect?.left + paddingHorizontal);
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

  return (
    <MenuStyled
      contained={contained}
      left={left}
      ref={containerRef}
      top={top}
      zIndex={HEADER_Z_INDEX + 100}
    >
      {items?.length >= 1 && (
        <>
          <Row direction="column" nogutter>
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
                <MenuItem item={item} small={small} />
              </div>
            ))}
          </Row>

          <div id={rootID} />
        </>
      )}
    </MenuStyled>
  );
}

export default Menu;
