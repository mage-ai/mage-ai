import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { ThemeProvider } from 'styled-components';
import { createRoot } from 'react-dom/client';

import Loading from '@mana/components/Loading';
import { AppConfigType } from '../../../interfaces';
import Grid from '@mana/components/Grid';
import DeferredRenderer from '@mana/components/DeferredRenderer';
import Text from '@mana/elements/Text';
import { ItemDetailType, ItemType } from '../interfaces';
import { LOCAL_STORAGE_KEY_FOLDERS_STATE, get, getSetUpdate } from '@storage/localStorage';
import { useFileIcon, getIconColorName, getFullPath } from '../utils';
import { removeClassNames } from '@utils/elements';
import { cleanName } from '@utils/string';
import {
  ColumnGapStyled,
  FolderStyled,
  LineStyled,
  NameStyled,
  childClassName,
  itemsClassName,
} from './index.style';
import { range, sortByKey } from '@utils/array';
import icons from '@mana/icons';
import { WithOnMount } from '@mana/hooks/useWithOnMount';

const { DiamondShared, FileIcon, FolderV2Filled } = icons;

type ItemProps = {
  app: AppConfigType;
  item: ItemType | ItemDetailType;
  onContextMenu: (event: React.MouseEvent<HTMLDivElement>) => void;
  themeContext: any;
};

function iconRootID(uuid: string) {
  return `icon-root-${uuid}`;
}

function itemsRootID(uuid: string) {
  return `items-root-${uuid}`;
}

function Item({ app, item, onContextMenu, themeContext }: ItemProps) {
  console.log('render', item?.name);
  const { items, name } = item as ItemType;

  const isFolder = useMemo(() => typeof items !== 'undefined' && items !== null, [items]);
  // TODO (dangerous): update this with a real dynamic value.
  const pipelineCount = 0;
  const {
    BlockIcon,
    Icon,
    folderNameForBlock,
    iconColor,
    isBlockFile,
    color: blockIconColor,
    isFirstParentFolderForBlock,
  } = useFileIcon({ isFolder, name, theme: themeContext, uuid: name });

  const isBlockFileWithSquareIcon = useMemo(
    () => !!folderNameForBlock && !isFolder && !!isBlockFile,
    [folderNameForBlock, isBlockFile, isFolder],
  );

  const iconColorName = useMemo(
    () => (isFolder ? 'blueMuted' : getIconColorName(String(name))),
    [isFolder, name],
  );
  const absolutePath = useMemo(() => getFullPath(item as ItemDetailType), [item]);
  const level = useMemo(() => absolutePath.split('/').length - 1, [absolutePath]);
  const uuid = useMemo(() => `${app?.uuid}-${cleanName(absolutePath)}`, [absolutePath, app?.uuid]);

  const iconRootRef = useRef(null);
  const itemsRootRef = useRef(null);
  const folderStatesRef = useRef(get(LOCAL_STORAGE_KEY_FOLDERS_STATE, {}));
  const expandedRef = useRef(
    uuid in folderStatesRef?.current ? folderStatesRef?.current?.[uuid] : level === 0,
  );
  const renderedRef = useRef(false);
  const itemsRef = useRef(null);

  const buildLines = useCallback(
    (levelIncrement?: number) => (
      <div style={{ display: 'flex' }}>
        {range((levelIncrement || 0) + level).map((_i, idx: number) => (
          <ColumnGapStyled key={`spacer-${uuid}-${idx}`}>
            <LineStyled />
          </ColumnGapStyled>
        ))}
      </div>
    ),
    [level, uuid],
  );
  const linesMemo = useMemo(() => buildLines(), [buildLines]);

  const buildIcon = useCallback(() => {
    if (isFolder) {
      if (isFirstParentFolderForBlock) {
        return <Icon color={blockIconColor} small />;
      } else {
        const IconUse = expandedRef?.current ? FolderV2Filled : Icon;
        if (IconUse) {
          return <IconUse colorName={iconColorName} small />;
        }
      }
    } else if (isBlockFileWithSquareIcon) {
      if (pipelineCount) {
        return <DiamondShared fill={blockIconColor} small />;
      } else if (BlockIcon) {
        return (
          <BlockIcon
            borderOnly={!pipelineCount}
            color={blockIconColor}
            size={folderNameForBlock && !isFolder ? 8 : 12}
            square
          />
        );
      }
    }

    const IconUse = Icon || FileIcon;

    return <IconUse colorName={iconColorName || iconColor} small />;
  }, [
    BlockIcon,
    Icon,
    iconColorName,
    blockIconColor,
    isFolder,
    isBlockFileWithSquareIcon,
    pipelineCount,
    iconColor,
    folderNameForBlock,
    isFirstParentFolderForBlock,
  ]);

  const renderIcon = useCallback(() => {
    if (!iconRootRef?.current) {
      const node = document.getElementById(iconRootID(uuid));
      iconRootRef.current = createRoot(node as HTMLElement);
    }

    if (iconRootRef?.current) {
      iconRootRef.current.render(<ThemeProvider theme={themeContext}>{buildIcon()}</ThemeProvider>);
    }
  }, [themeContext, uuid, buildIcon]);

  const renderItems = useCallback(() => {
    if (!itemsRootRef?.current) {
      const node = document.getElementById(itemsRootID(uuid));
      itemsRootRef.current = createRoot(node as HTMLElement);
    }

    if (itemsRootRef?.current) {
      const values = sortByKey(Object.values(items || {}), (item: ItemDetailType) => {
        const order = typeof item?.items !== 'undefined' && item?.items !== null ? 0 : 1;
        return `${order}-${item?.name}`;
      });

      itemsRootRef.current.render(
        <React.StrictMode>
          <ThemeProvider theme={themeContext}>
            <Grid ref={itemsRef} rowGap={0} uuid={itemsClassName(uuid)}>
              <DeferredRenderer
                fallback={
                  <ThemeProvider theme={themeContext}>
                    <div style={{ display: 'flex' }}>
                      {buildLines(1)}
                      <Loading position="absolute" />
                    </div>
                  </ThemeProvider>
                }
                idleTimeout={1}
              >
                {values?.map((item: ItemDetailType) => (
                  <Item
                    app={app}
                    item={item}
                    key={item.name}
                    onContextMenu={onContextMenu}
                    themeContext={themeContext}
                  />
                ))}
              </DeferredRenderer>
            </Grid>
          </ThemeProvider>
        </React.StrictMode>,
      );
      renderedRef.current = true;
    }
  }, [app, themeContext, uuid, items, buildLines, onContextMenu]);

  const renderUpdates = useCallback(() => {
    getSetUpdate(LOCAL_STORAGE_KEY_FOLDERS_STATE, {
      [uuid]: expandedRef?.current,
    });

    renderIcon();

    if (renderedRef?.current && itemsRef?.current) {
      const element = itemsRef?.current;
      element.className = [
        removeClassNames(element?.className, ['collapsed', 'expanded']),
        expandedRef.current ? 'expanded' : 'collapsed',
      ].join(' ');
    } else if (items && expandedRef.current) {
      renderItems();
    }
  }, [items, renderIcon, renderItems, uuid]);

  return (
    <FolderStyled uuid={uuid}>
      <Grid
        columnGap={0}
        onClick={(event: React.MouseEvent<HTMLDivElement>) => {
          event.preventDefault();
          event.stopPropagation();

          expandedRef.current = !expandedRef.current;

          renderUpdates();
        }}
        onContextMenu={onContextMenu}
        templateColumns="auto 1fr"
        uuid={childClassName(uuid)}
      >
        {linesMemo}

        <NameStyled>
          <Grid compact templateColumns="auto 1fr">
            <div id={iconRootID(uuid)}>{buildIcon()}</div>
            {name && (
              <Text blue={isFolder} monospace small>
                {String(name)}
              </Text>
            )}
          </Grid>
        </NameStyled>
      </Grid>

      <WithOnMount
        onMount={() => {
          if (expandedRef?.current) {
            renderUpdates();
          }
        }}
      >
        <div id={itemsRootID(uuid)} />
      </WithOnMount>
    </FolderStyled>
  );
}

export default Item;
