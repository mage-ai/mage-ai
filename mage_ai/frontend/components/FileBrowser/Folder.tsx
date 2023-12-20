import styled from 'styled-components';
import { createRoot } from 'react-dom/client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import Circle from '@oracle/elements/Circle';
import FileType, {
  ALL_SUPPORTED_FILE_EXTENSIONS_REGEX,
  FOLDER_NAME_CHARTS,
  FOLDER_NAME_PIPELINES,
  FileExtensionEnum,
  SUPPORTED_EDITABLE_FILE_EXTENSIONS_REGEX,
} from '@interfaces/FileType';
import Flex from '@oracle/components/Flex';
import Text from '@oracle/elements/Text';
import { BLOCK_TYPE_ICON_MAPPING } from '@components/CustomTemplates/BrowseTemplates/constants';
import { ALL_BLOCK_TYPES, BlockTypeEnum } from '@interfaces/BlockType';
import {
  Charts,
  ChevronDown,
  ChevronRight,
  Ellipsis,
  FileFill,
  FolderV2Filled as FolderIcon,
  Logs,
  NavGraph,
  ParentEmpty,
  Pipeline,
  PipelineV3,
  RoundedSquare,
  Table,
} from '@oracle/icons';
import { ContextAreaProps } from '@components/ContextMenu';
import {
  CUSTOM_EVENT_NAME_FOLDER_EXPAND,
} from '@utils/events/constants';
import { FILE_EXTENSION_COLOR_MAPPING, FILE_EXTENSION_ICON_MAPPING } from './constants';
import {
  ICON_SIZE,
  INDENT_WIDTH,
} from './index.style';
import { ThemeType } from '@oracle/styles/themes/constants';
import { UNIT, WIDTH_OF_SINGLE_CHARACTER } from '@oracle/styles/units/spacing';
import { ViewKeyEnum } from '@components/Sidekick/constants';
import { LOCAL_STORAGE_KEY_FOLDERS_STATE, get, getSetUpdate } from '@storage/localStorage';
import { getColorsForBlockType } from '@components/CodeBlock/index.style';
import {
  getBlockFromFile,
  getBlockUUIDFromFile,
  getFileExtension,
  getFullPath,
  getFullPathWithoutRootFolder,
  getNonPythonBlockFromFile,
  validBlockFileExtension,
  validBlockFromFilename,
} from './utils';
import { range, sortByKey } from '@utils/array';
import { singularize } from '@utils/string';

const DEFAULT_NAME = 'default_repo';

export type FolderSharedProps = {
  allowEmptyFolders?: boolean;
  allowSelectingFolders?: boolean;
  disableContextMenu?: boolean;
  isFileDisabled?: (filePath: string, children: FileType[]) => boolean;
  isInPipelinesFolder?: boolean;
  isNotFolder?: boolean;
  onlyShowChildren?: boolean;
  onSelectBlockFile?: (
    blockUUID: string,
    blockType: BlockTypeEnum,
    filePath: string,
    opts?: {
      file?: FileType;
      path?: string;
    },
  ) => void;
  onClickFile?: (path: string) => void;
  onClickFolder?: (path: string) => void;
  openFile?: (path: string) => void;
  openSidekickView?: (newView: ViewKeyEnum, pushHistory?: boolean) => void;
  renderAfterContent?: (file: FileType) => any;
  selectFile?: (path: string) => void;
  useRootFolder?: boolean;
};

type FolderProps = {
  containerRef: any;
  file: FileType;
  level: number;
  reloadCount?: number;
  setCoordinates: (coordinates: {
    x: number;
    y: number;
  }) => void;
  setDraggingFile: (file: FileType) => void;
  setSelectedFile: (file: FileType) => void;
  theme: ThemeType;
  timeout?: any;
  uuidCombined?: string[];
} & FolderSharedProps & ContextAreaProps;

const ChildrenStyle = styled.div`
  .expanded_children {
    display: block;
  }

  .collapsed_children {
    display: none;
  }
`;

const ChevronStyle = styled.div`
  .expanded {
    .down {
      display: block;
      position: relative;
    }

    .right {
      display: none;
      position: absolute;
    }
  }

  .collapsed {
    .down {
      display: none;
      position: absolute;
    }

    .right {
      display: block;
      position: relative;
    }
  }
`;

function DeferredRender({ children, idleTimeout }) {
  const [render, setRender] = useState(false);

  useEffect(() => {
    if (render) setRender(false);
    const id = requestIdleCallback(() => setRender(true), { timeout: idleTimeout });

    return () => cancelIdleCallback(id);
  }, [idleTimeout]);

  if (!render) return null;

  return children;
}

function Folder({
  allowEmptyFolders,
  allowSelectingFolders,
  containerRef,
  disableContextMenu,
  file,
  isFileDisabled,
  isInPipelinesFolder,
  isNotFolder,
  level,
  onClickFile,
  onClickFolder,
  onSelectBlockFile,
  onlyShowChildren,
  openFile,
  openSidekickView,
  reloadCount,
  renderAfterContent,
  selectFile,
  setContextItem,
  setCoordinates,
  setDraggingFile,
  setSelectedFile,
  theme,
  timeout,
  useRootFolder,
  uuidCombined,
}: FolderProps) {
  const {
    children: childrenProp,
    disabled: disabledProp,
    name,
    parent: parentFile,
  } = file;
  const children = useMemo(() =>
    (childrenProp
      ? sortByKey(childrenProp, ({
          children: arr,
        }) => arr ? 0 : 1)
      : childrenProp
    ),
    [childrenProp],
  );

  const uuidCombinedUse =
    useMemo(() => [].concat(uuidCombined || []).concat(name || DEFAULT_NAME), [
      name,
      uuidCombined,,
    ]);
  const uuid = useMemo(() => uuidCombinedUse?.join('/'), [uuidCombinedUse])

  const folderStates = get(LOCAL_STORAGE_KEY_FOLDERS_STATE, {});
  const refChildren = useRef(null);
  const refChevron = useRef(null);
  const refExpandState = useRef(uuid in folderStates
    ? folderStates[uuid]
    : level === 0
  );
  const refExpandCount = useRef(0);
  const expanded = refExpandState.current;

  if (!name && !allowEmptyFolders) {
    file.name = DEFAULT_NAME;
  }
  const filePathToUse: string = useRootFolder
    ? getFullPath(file)
    : getFullPathWithoutRootFolder(file);

  const isFolder = useMemo(() => !!children && !isNotFolder, [children, isNotFolder]);

  const folderNameForBlock = useMemo(() => uuidCombinedUse?.find?.(
    (key) => {
      const keySingle = singularize(key);

      return keySingle in ALL_BLOCK_TYPES;
    },
  ), [uuidCombinedUse]);
  const blockType = useMemo(() => folderNameForBlock ? singularize(folderNameForBlock) : null, [
    folderNameForBlock,
  ]);
  const isFirstParentFolderForBlock = useMemo(() => isFolder && folderNameForBlock && folderNameForBlock === name, [
    folderNameForBlock,
    isFolder,
    name,
  ]);
  const isBlockFile = useMemo(() => folderNameForBlock
    && !isFolder
    && validBlockFileExtension(name)
    && validBlockFromFilename(name, blockType), [
      blockType,
      folderNameForBlock,
      isFolder,
      name,
    ]);

  const color = useMemo(() => folderNameForBlock
    ? getColorsForBlockType(blockType, { theme }).accent
    : null,
    [
      blockType,
      folderNameForBlock,
    ]);

  const isPipelineFolder = name === FOLDER_NAME_PIPELINES;

  const disabled = useMemo(() => isFileDisabled
    ? isFileDisabled(filePathToUse, children)
    : disabledProp
      || (isInPipelinesFolder && name === '__init__.py')
      || (folderNameForBlock && name === '__init__.py'),
  [
    children,
    disabledProp,,
    filePathToUse,
    folderNameForBlock,
    isFileDisabled,
    isInPipelinesFolder,
    name,
  ]);

  const {
    IconEl,
    fileIconColor,
  } = useMemo(() => {
    let fileIconColorInner;
    let IconElInner = FileFill;

    if (!isFolder && isNotFolder) {
      IconElInner = Ellipsis;
    } else if (isPipelineFolder) {
      IconElInner = PipelineV3
    } else if (name === FOLDER_NAME_CHARTS) {
      IconElInner = Charts;
    } else if (isFolder) {
      if (isFirstParentFolderForBlock) {
        IconElInner = BLOCK_TYPE_ICON_MAPPING?.[blockType] || FolderIcon;
      } else {
        IconElInner = FolderIcon;
      }
    } else if (!name && allowEmptyFolders) {
      IconElInner = Ellipsis;
    } else if (isInPipelinesFolder && !isFolder && name === 'metadata.yaml') {
      IconElInner = Pipeline;
    } else if (name?.includes('.log')) {
      IconElInner = Logs;
    } else if (!isFolder) {
      const fx = getFileExtension(name);
      if (fx && fx in FILE_EXTENSION_ICON_MAPPING) {
        IconElInner = FILE_EXTENSION_ICON_MAPPING[fx];
        fileIconColorInner = FILE_EXTENSION_COLOR_MAPPING[fx];
      }
    }

    return {
      IconEl: IconElInner,
      fileIconColor: fileIconColorInner,
   };
  }, [
    allowEmptyFolders,
    blockType,
    isFirstParentFolderForBlock,
    isFolder,
    isInPipelinesFolder,
    isNotFolder,
    level,
    name,
  ]);

  const BlockIconEl = useMemo(() => {
    let BlockIconElInner = Circle;
    if (BlockTypeEnum.CHART === blockType) {
      BlockIconElInner = Charts;
    }

    return BlockIconElInner;
  }, [
    blockType,
  ]);

  const buildChildrenFiles = useCallback((
    arr: FileType[],
  ) => arr?.map((f: FileType) => (
    <Folder
      allowEmptyFolders={allowEmptyFolders}
      allowSelectingFolders={allowSelectingFolders}
      containerRef={containerRef}
      disableContextMenu={disableContextMenu}
      file={{
        ...f,
        parent: file,
      }}
      isFileDisabled={isFileDisabled}
      isNotFolder={f?.isNotFolder}
      isInPipelinesFolder={isInPipelinesFolder || isPipelineFolder}
      key={`${uuid}/${f?.name || DEFAULT_NAME}-${reloadCount}`}
      level={onlyShowChildren ? level : level + 1}
      onClickFile={onClickFile}
      onClickFolder={onClickFolder}
      onSelectBlockFile={onSelectBlockFile}
      openFile={openFile}
      openSidekickView={openSidekickView}
      reloadCount={reloadCount}
      renderAfterContent={renderAfterContent}
      selectFile={selectFile}
      setContextItem={setContextItem}
      setCoordinates={setCoordinates}
      setDraggingFile={setDraggingFile}
      setSelectedFile={setSelectedFile}
      theme={theme}
      timeout={timeout}
      useRootFolder={useRootFolder}
      uuidCombined={uuidCombinedUse}
    />
  )), [
    allowEmptyFolders,
    allowSelectingFolders,
    children,
    // containerRef,
    disableContextMenu,
    file,
    isFileDisabled,
    isInPipelinesFolder,
    isPipelineFolder,
    level,
    onClickFile,
    onClickFolder,
    onSelectBlockFile,
    onlyShowChildren,
    openFile,
    openSidekickView,
    reloadCount,
    renderAfterContent,
    selectFile,
    setContextItem,
    setCoordinates,
    setDraggingFile,
    setSelectedFile,
    // theme,
    // timeout,
    useRootFolder,
    uuid,
    uuidCombinedUse,
  ]);

  const toggleExpandsion = useCallback((
    expand: boolean = null,
    idleTimeout: number = null,
  ) => {
    if (typeof expand === 'undefined' || expand === null) {
      refExpandState.current = !refExpandState.current;
    } else {
      refExpandState.current = expand;
    }

    refChildren.current.className = refExpandState.current ? 'expanded_children' : 'collapsed_children';
    refChevron.current.className = refExpandState.current ? 'expanded' : 'collapsed';

    if (refExpandCount.current === 0) {
      const domNode = document.getElementById(refChildren.current.id);
      const root = createRoot(domNode);
      root.render(
        children?.length >= 1
          ? (
            <DeferredRender idleTimeout={idleTimeout ? idleTimeout : 1}>
              {buildChildrenFiles(children)}
            </DeferredRender>
          )
          // @ts-ignore
          : (isFolder ? buildChildrenFiles(childrenEmpty) : <div />),
      );
    }

    getSetUpdate(LOCAL_STORAGE_KEY_FOLDERS_STATE, {
      [uuid]: refExpandState.current,
    });
    refExpandCount.current += 1;
  }, [
    children,
    isFolder,
    uuid,
  ]);

  useEffect(() => {
    const handleExpand = ({
      detail: {
        expand,
        file,
        folder,
      },
    }) => {
      if (isFolder && folder && uuid?.startsWith(folder?.uuid)) {
        getSetUpdate(LOCAL_STORAGE_KEY_FOLDERS_STATE, {
          [uuid]: expand,
        });
        toggleExpandsion(expand, 100 * level);
      }
    };

    if (typeof window !== 'undefined') {
      // @ts-ignore
      window.addEventListener(CUSTOM_EVENT_NAME_FOLDER_EXPAND, handleExpand);
    }

    return () => {
      if (typeof window !== 'undefined') {
        // @ts-ignore
        window.removeEventListener(CUSTOM_EVENT_NAME_FOLDER_EXPAND, handleExpand);
      }
    };
  }, [
    isFolder,
    level,
    toggleExpandsion,
    uuid,
  ]);

  const childrenEmpty = useMemo(() => [{
    disabled: true,
    name: 'Empty',
    parent: file,
    isNotFolder: true,
    uuid: uuidCombinedUse,
  }], [file, uuidCombinedUse]);

  const lineEls = useMemo(() => {
    const arr = [];

    range(level).forEach((_, idx: number) => {
      const width = INDENT_WIDTH - 1;

      arr.push(
        <div
          key={`line-${uuid}-${idx}`}
          style={{
            borderLeft: `1px solid ${theme?.content?.disabled}`,
            height: 22,
            marginLeft: (width / 2) - 2,
            paddingLeft: (width / 2) + 2,
          }}
        />,
      );
    });

    return arr;
  }, [
    level,
    theme,
    uuid,
  ]);

  useEffect(() => {
    setTimeout(() => {
      if (expanded && refExpandCount?.current === 0 && refChildren?.current?.id) {
        refExpandCount.current = 1;

        const domNode = document.getElementById(refChildren?.current?.id);
        try {
          const root = createRoot(domNode);
          root.render(
            children?.length >= 1
              ? (
                <DeferredRender idleTimeout={100 * level}>
                  {buildChildrenFiles(children)}
                </DeferredRender>
              )
              : !children?.length
                ? isFolder
                  // @ts-ignore
                  ? buildChildrenFiles(childrenEmpty)
                  : <div />
                : null,
          );
        } catch(err) {
          console.log(err);
        }
      }
    }, 1);
  }, []);

  return (
    <>
      {!onlyShowChildren && (
        <div
          className="row"
          onClick={(e) => {
            e.preventDefault();

            if (disabled) {
              return;
            }

            if (parentFile?.name === FOLDER_NAME_CHARTS) {
              // Not used anymore
              openSidekickView?.(ViewKeyEnum.CHARTS);
              const block = getBlockFromFile(file);
              if (block) {
                onSelectBlockFile?.(
                  block.uuid,
                  block.type,
                  getFullPathWithoutRootFolder(file),
                );
              }
            }

            const nonPythonBlockFromFile = getNonPythonBlockFromFile(file);

            if (children) {
              if (allowSelectingFolders) {
                selectFile(filePathToUse);
              } else {
                toggleExpandsion();
              }
              onClickFolder?.(filePathToUse);
            } else {
              if (onClickFile) {
                onClickFile(filePathToUse);
              } else if (nonPythonBlockFromFile) {
                onSelectBlockFile?.(
                  nonPythonBlockFromFile.uuid,
                  nonPythonBlockFromFile.type,
                  getFullPathWithoutRootFolder(file),
                  {
                    file,
                    path: filePathToUse,
                  },
                );
              } else if (name.match(SUPPORTED_EDITABLE_FILE_EXTENSIONS_REGEX)) {
                openFile?.(filePathToUse);
              } else {
                const block = getBlockFromFile(file);
                if (block) {
                  onSelectBlockFile?.(
                    block.uuid,
                    block.type,
                    getFullPathWithoutRootFolder(file),
                  );
                }
              }
            }
          }}
          onContextMenu={(e) => {
            clearTimeout(timeout.current);

            if (!containerRef?.current?.contains(e.target) || disableContextMenu) {
              return;
            }

            e.preventDefault();

            setCoordinates({
              x: e.pageX,
              y: e.pageY,
            });
            setDraggingFile(null);
            setSelectedFile({
              ...file,
              uuid,
            });
          }}
          onMouseDown={(e) => {
            const block = file ? getBlockFromFile(file, null, true) : null;

            if (!containerRef?.current?.contains(e.target)
              || !block
              || children?.length >= 1
              || disableContextMenu
              || disabled
              || isInPipelinesFolder
            ) {
              return;
            }

            e.preventDefault();

            clearTimeout(timeout.current);
            timeout.current = setTimeout(() => {
              setCoordinates({
                x: e.pageX,
                y: e.pageY,
              });
              setDraggingFile(file);
              setSelectedFile(null);
            }, 300);
          }}
          style={{
            alignItems: 'center',
            cursor: 'default',
            display: 'flex',
            minWidth: (level * INDENT_WIDTH) + (file.name.length * WIDTH_OF_SINGLE_CHARACTER) + (UNIT * 2),
            paddingRight: (UNIT / 4),
          }}
        >
          <Flex alignItems="center" flex={1}>
            {lineEls}

            <ChevronStyle>
              {children && (
                <div className={expanded ? 'expanded' : 'collapsed'} ref={refChevron}>
                  <div className="down"><ChevronDown muted size={ICON_SIZE} /></div>
                  <div className="right"><ChevronRight muted size={ICON_SIZE} /></div>
                </div>
              )}
              {!children && <div style={{ width: ICON_SIZE }} />}
            </ChevronStyle>

            <div
              style={{
                marginLeft: UNIT / 2,
                marginRight: UNIT / 2,
              }}
            >
              {(!!folderNameForBlock && !isFolder && !!isBlockFile)
                ? (
                  <BlockIconEl
                    color={color}
                    size={(folderNameForBlock && !isFolder)
                      ? ICON_SIZE * 0.7
                      : ICON_SIZE
                    }
                    square
                  />
                )
                : (
                  <IconEl
                    fill={fileIconColor || (isFirstParentFolderForBlock ? color : null)}
                    disabled={disabled}
                    size={ICON_SIZE}
                  />
                )
              }
            </div>

            <Text
              // color={folderNameForBlock && isFolder ? color : null}
              // default={(!folderNameForBlock || !isFolder) && !disabled
              default={!disabled}
              disabled={disabled}
              monospace
              small
            >
              {name}
            </Text>
          </Flex>

          {renderAfterContent && renderAfterContent(file)}
        </div>
      )}

      <ChildrenStyle>
        <div
          className={expanded ? 'expanded_children' : 'collapsed_children'}
          id={uuid}
          ref={refChildren}
        />
      </ChildrenStyle>
    </>
  );
}

export default Folder;
