import * as osPath from 'path';
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
import { getIconColorName, getFullPath } from '../utils';
import useFileIcon from '../utils/useFileIcon';
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

const { DiamondShared, FileIcon, Circle, CaretDown, CaretRight } = icons;

type ItemProps = {
  app: AppConfigType;
  item: ItemType | ItemDetailType;
  onClick?: (event: React.MouseEvent<HTMLDivElement>, item: ItemDetailType) => void;
  onContextMenu: (event: React.MouseEvent<HTMLDivElement>) => void;
  themeContext: any;
};

function iconRootID(uuid: string) {
  return `icon-root-${uuid}`;
}

function iconActionRootID(uuid: string) {
  return `icon-action-root-${uuid}`;
}

function itemsRootID(uuid: string) {
  return `items-root-${uuid}`;
}

function Item({ app, item, onClick, onContextMenu, themeContext }: ItemProps) {
  const { items, path, name } = item as ItemDetailType;

  const isFolder = useMemo(() => typeof items !== 'undefined' && items !== null, [items]);
  // TODO (dangerous): update this with a real dynamic value.
  const pipelineCount = 0;
  const {
    BlockIcon,
    Icon,
    color: blockIconColor,
    folderNameForBlock,
    iconColor,
    isBlockFile,
    isFirstParentFolderForBlock,
  } = useFileIcon({
    filePathToUse: path,
    isFolder,
    name,
    theme: themeContext,
    uuid: name,
  });

  const isBlockFileWithSquareIcon = useMemo(
    () => !!folderNameForBlock && !isFolder && !!isBlockFile,
    [folderNameForBlock, isBlockFile, isFolder],
  );

  const iconColorName = useMemo(
    () => (isFolder ? 'blueMuted' : getIconColorName(String(name))),
    [isFolder, name],
  );
  const absolutePath = useMemo(() => String(item?.path) || osPath.sep, [item]);
  const level = useMemo(
    () =>
      absolutePath?.split(osPath.sep)?.filter(p => p?.length >= 1 && p !== osPath.sep)?.length - 1,
    [absolutePath],
  );
  const uuid = useMemo(() => `${app?.uuid}-${cleanName(absolutePath)}`, [absolutePath, app?.uuid]);

  const iconRootRef = useRef(null);
  const iconActionRootRef = useRef(null);
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
        <ColumnGapStyled />
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
      } else if (Icon) {
        return <Icon colorName={iconColorName} small />;
      }
    } else if (isBlockFileWithSquareIcon) {
      if (pipelineCount) {
        return <DiamondShared fill={blockIconColor} small />;
      } else if (BlockIcon) {
        return <BlockIcon color={blockIconColor} size={folderNameForBlock && !isFolder ? 8 : 12} />;
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

  const buildIconAction = useCallback(() => {
    const IconUse = isFolder ? (expandedRef?.current ? CaretDown : CaretRight) : Circle;

    return (
      <IconUse
        colorName={isFolder ? iconColorName : 'whiteLo'}
        size={isFolder ? undefined : 8}
        xsmall={isFolder}
      />
    );
  }, [iconColorName, isFolder]);

  const renderIcon = useCallback(() => {
    if (!iconRootRef?.current) {
      const node = document.getElementById(iconRootID(uuid));
      if (node) {
        iconRootRef.current = createRoot(node as HTMLElement);
      }
    }

    if (iconRootRef?.current) {
      iconRootRef.current.render(<ThemeProvider theme={themeContext}>{buildIcon()}</ThemeProvider>);
    }

    if (!iconActionRootRef?.current) {
      const node = document.getElementById(iconActionRootID(uuid));
      if (node) {
        iconActionRootRef.current = createRoot(node as HTMLElement);
      }
    }

    if (iconActionRootRef?.current) {
      iconActionRootRef.current.render(
        <ThemeProvider theme={themeContext}>{buildIconAction()}</ThemeProvider>,
      );
    }
  }, [themeContext, uuid, buildIcon, buildIconAction]);

  const renderItems = useCallback(() => {
    if (!itemsRootRef?.current) {
      const node = document.getElementById(itemsRootID(uuid));
      if (node) {
        itemsRootRef.current = createRoot(node as HTMLElement);
      }
    }

    if (itemsRootRef?.current) {
      const values = sortByKey(Object.values(items || {}), (item: ItemDetailType) => {
        const order = typeof item?.items !== 'undefined' && item?.items !== null ? 0 : 1;
        return `${order}-${item?.name}`;
      });

      itemsRootRef.current.render(
        <ThemeProvider theme={themeContext}>
          <Grid alignItems='center' ref={itemsRef} rowGap={0} uuid={itemsClassName(uuid)}>
            <DeferredRenderer
              fallback={
                <ThemeProvider theme={themeContext}>
                  <div style={{ display: 'flex' }}>
                    {buildLines(1)}
                    <Loading position='absolute' />
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
                  onClick={onClick}
                  onContextMenu={onContextMenu}
                  themeContext={themeContext}
                />
              ))}
            </DeferredRenderer>
          </Grid>
        </ThemeProvider>,
      );
      renderedRef.current = true;
    }
  }, [app, themeContext, uuid, items, buildLines, onClick, onContextMenu]);

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

  function removeItems() {
    if (itemsRootRef?.current) {
      itemsRootRef?.current?.unmount();
      itemsRootRef.current = null;
      renderedRef.current = false;
    }
  }

  useEffect(() => {
    if (!renderedRef?.current) {
      if (expandedRef?.current) {
        renderUpdates();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <FolderStyled uuid={uuid}>
      <Grid
        columnGap={0}
        onClick={(event: React.MouseEvent<HTMLDivElement>) => {
          event.preventDefault();
          event.stopPropagation();

          expandedRef.current = !expandedRef.current;
          renderUpdates();

          if (onClick) {
            onClick?.(event, item as ItemDetailType);
          }
        }}
        onContextMenu={onContextMenu}
        templateColumns='auto 1fr'
        uuid={childClassName(uuid)}
      >
        {linesMemo}

        <NameStyled>
          <Grid alignItems='center' columnGap={8} templateColumns='auto auto 1fr'>
            <div id={iconActionRootID(uuid)}>{buildIconAction()}</div>
            <div id={iconRootID(uuid)}>{buildIcon()}</div>
            {name && (
              <Text blue={isFolder} monospace muted={!isFolder} small>
                {String(name)}
              </Text>
            )}
          </Grid>
        </NameStyled>
      </Grid>

      <div id={itemsRootID(uuid)} />
    </FolderStyled>
  );
}

export default Item;
