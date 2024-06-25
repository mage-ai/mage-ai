import React, { useCallback, useContext, useMemo, useRef } from 'react';
import { ThemeContext, ThemeProvider } from 'styled-components';
import { createRoot } from 'react-dom/client';
import { Variants, motion } from 'framer-motion';

import Button from '../../elements/Button';
import DeferredRenderer from '../DeferredRenderer';
import Grid from '../Grid';
import KeyboardTextGroup from '../../elements/Text/Keyboard/Group';
import Text from '../../elements/Text';
import { CaretRight } from '@mana/icons';
import useDebounce from '@utils/hooks/useDebounce';
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

const itemVariants: Variants = {
  open: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 24 },
  },
  closed: { opacity: 0, y: 20, transition: { duration: 0.2 } },
};

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
    return (
      <DividerContainer>
        <DividerStyled />
      </DividerContainer>
    );
  }

  const before = Icon ? <Icon size={small ? 12 : undefined} /> : undefined;

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
            columnGap={4}
            templateColumns={[before && 'auto', '1fr'].filter(Boolean).join(' ')}
          >
            {before}
            <Text bold={!onClick} muted={!onClick} small={small}>
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
      noHover={!onClick ? 'true' : undefined}
    >
      <ItemContent first={first} last={last} noHover={!onClick ? 'true' : undefined}>
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

    const { height: heightMenu } = containerRef?.current?.getBoundingClientRect() || { height: 0 };

    const element = event?.target as HTMLElement;
    const rect = element?.getBoundingClientRect() || ({} as DOMRect);
    let yFinal = y + UNIT / 2;
    const menuHeight = heightMenu ?? MENU_ITEM_HEIGHT * items.length;
    if (y + menuHeight >= window.innerHeight) {
      yFinal = window.innerHeight - (menuHeight + UNIT * 2);
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
      contained={contained ? 'true' : undefined}
      left={left}
      ref={containerRef}
      top={top}
      zIndex={HEADER_Z_INDEX + 100}
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
            {items?.map((item: MenuItemType, idx: number) => (
              <motion.div
                key={`menu-item-${item.uuid}-${idx}`}
                onMouseEnter={event => {
                  cancel();
                  debouncer(() => renderItems(item, event), 100);
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
                  small={small}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </MenuContent>

      <div id={rootID} />
    </MenuStyled>
  );
}

export default Menu;
