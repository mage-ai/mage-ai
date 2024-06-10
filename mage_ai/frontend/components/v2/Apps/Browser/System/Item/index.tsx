import React, { createRef, useRef } from 'react';
import { ThemeProvider } from 'styled-components';
import { createRoot } from 'react-dom/client';

import { AppConfigType } from '../../../interfaces';
import Grid from '@mana/components/Grid';
import DeferredRenderer from '@mana/components/DeferredRenderer';
import Text from '@mana/elements/Text';
import { ItemDetailType, ItemType } from '../interfaces';
import { useFileIcon, getIconColorName, getFullPath } from '../utils';
import { cleanName } from '@utils/string';
import { ColumnGapStyled, FolderStyled, LineStyled, NameStyled, childClassName, itemsClassName } from './index.style';
import { range } from '@utils/array';
import icons from '@mana/icons';

const { FolderV2Filled } = icons;

type ItemProps = {
  app: AppConfigType;
  item: ItemType | ItemDetailType;
  themeContext: any;
};

function iconRootID(uuid: string) {
  return `icon-root-${uuid}`;
}

function itemsRootID(uuid: string) {
  return `items-root-${uuid}`;
}

function Item({ app, item, themeContext }: ItemProps) {
  console.log('render');
  const { items, name } = item as ItemType;
  const isFolder = typeof items !== 'undefined' && items !== null;

  const iconRootRef = useRef(null);
  const itemsRootRef = useRef(null);
  const expandedRef = useRef(false);
  const renderedRef = useRef(false);

  const { Icon } = useFileIcon({ isFolder, name });
  const iconColorName = isFolder ? 'blueMuted' : getIconColorName(String(name));
  const absolutePath = getFullPath(item as ItemDetailType);
  const level = absolutePath.split('/').length - 1;
  const uuid = `${app?.uuid}-${cleanName(absolutePath)}`;

  function buildIcon() {
    const props = { colorName: iconColorName, small: true };
    const IconUse = isFolder && expandedRef?.current ? FolderV2Filled : Icon;
    return <IconUse {...props} />;
  }

  function renderIcon() {
    if (!iconRootRef?.current) {
      const node = document.getElementById(iconRootID(uuid));
      iconRootRef.current = createRoot(node as HTMLElement);
    }

    if (iconRootRef?.current) {
      iconRootRef.current.render(
        <ThemeProvider theme={themeContext}>
          {buildIcon()}
        </ThemeProvider>,
      );
    }
  }

  function renderItems() {
    if (!itemsRootRef?.current) {
      const node = document.getElementById(itemsRootID(uuid));
      itemsRootRef.current = createRoot(node as HTMLElement);
    }

    if (itemsRootRef?.current) {
      itemsRootRef.current.render(
        <React.StrictMode>
          <DeferredRenderer idleTimeout={1}>
            <ThemeProvider theme={themeContext}>
              <Grid rowGap={0} uuid={itemsClassName(uuid)}>
                {Object.values(items).map((item: ItemDetailType) => (
                  <Item app={app} item={item} key={item.name} themeContext={themeContext} />
              ))}
              </Grid>
            </ThemeProvider>
          </DeferredRenderer>
        </React.StrictMode>,
      );
      renderedRef.current = true;
    }
  }

  return (
    <FolderStyled uuid={uuid}>
      <Grid
        columnGap={0}
        onClick={() => {

          expandedRef.current = !expandedRef.current;
          renderIcon();
          if (expandedRef?.current) {
            if (renderedRef?.current) {
              // show/hide
            } else if (items) {
              renderItems();
            }
          }
        }}
        templateColumns="auto 1fr"
        uuid={childClassName(uuid)}
      >
        <div style={{ display: 'flex' }}>
          {range(level).map((_i, idx: number) => (
            <ColumnGapStyled key={`spacer-${uuid}-${idx}`}>
              <LineStyled />
            </ColumnGapStyled>
          ))}
        </div>

        <NameStyled>
          <Grid
            compact
            templateColumns="auto 1fr"
          >
            <div id={iconRootID(uuid)}>
              {buildIcon()}
            </div>
            {name && <Text blue={isFolder} monospace small>{String(name)}</Text>}
          </Grid>
        </NameStyled>
      </Grid>

      <div id={itemsRootID(uuid)} />
    </FolderStyled>
  );
}

export default Item;
