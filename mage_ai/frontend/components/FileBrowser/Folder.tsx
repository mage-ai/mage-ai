import { useMemo, useState } from 'react';

import Circle from '@oracle/elements/Circle';
import FileType, {
  ALL_SUPPORTED_FILE_EXTENSIONS_REGEX,
  FOLDER_NAME_CHARTS,
  FOLDER_NAME_PIPELINES,
  SUPPORTED_EDITABLE_FILE_EXTENSIONS_REGEX,
} from '@interfaces/FileType';
import Flex from '@oracle/components/Flex';
import Text from '@oracle/elements/Text';
import { BLOCK_TYPES, BlockTypeEnum } from '@interfaces/BlockType';
import {
  Ellipsis,
  ChevronDown,
  ChevronRight,
  FileFill,
  Folder as FolderIcon,
  NavGraph,
  Pipeline,
} from '@oracle/icons';
import { ContextAreaProps } from '@components/ContextMenu';
import {
  ICON_SIZE,
  INDENT_WIDTH,
} from './index.style';
import { ThemeType } from '@oracle/styles/themes/constants';
import { UNIT, WIDTH_OF_SINGLE_CHARACTER } from '@oracle/styles/units/spacing';
import { ViewKeyEnum } from '@components/Sidekick/constants';
import { get, set } from '@storage/localStorage';
import { getColorsForBlockType } from '@components/CodeBlock/index.style';
import {
  getBlockFromFile,
  getBlockUUIDFromFile,
  getFullPath,
  getFullPathWithoutRootFolder,
  getNonPythonBlockFromFile,
} from './utils';
import { range, sortByKey } from '@utils/array';
import { singularize } from '@utils/string';

const DEFAULT_NAME = 'default_repo';

export type FolderSharedProps = {
  allowEmptyFolders?: boolean;
  allowSelectingFolders?: boolean;
  disableContextMenu?: boolean;
  isFileDisabled?: (filePath: string, children: FileType[]) => boolean;
  onlyShowChildren?: boolean;
  onSelectBlockFile?: (
    blockUUID: string,
    blockType: BlockTypeEnum,
    filePath: string,
  ) => void;
  onClickFile?: (path: string) => void;
  onClickFolder?: (path: string) => void;
  openFile?: (path: string) => void;
  openPipeline?: (uuid: string) => void;
  openSidekickView?: (newView: ViewKeyEnum, pushHistory?: boolean) => void;
  renderAfterContent?: (file: FileType) => any;
  selectFile?: (path: string) => void;
  uncollapsed?: boolean;
  useRootFolder?: boolean;
};

type FolderProps = {
  containerRef: any;
  file: FileType;
  level: number;
  pipelineBlockUuids: string[];
  setCoordinates: (coordinates: {
    x: number;
    y: number;
  }) => void;
  setDraggingFile: (file: FileType) => void;
  setSelectedFile: (file: FileType) => void;
  theme: ThemeType;
  timeout?: any;
} & FolderSharedProps & ContextAreaProps;

function Folder({
  allowEmptyFolders,
  allowSelectingFolders,
  containerRef,
  disableContextMenu,
  file,
  isFileDisabled,
  level,
  onClickFile,
  onClickFolder,
  onSelectBlockFile,
  onlyShowChildren,
  openFile,
  openPipeline,
  openSidekickView,
  pipelineBlockUuids,
  renderAfterContent,
  selectFile,
  setContextItem,
  setCoordinates,
  setDraggingFile,
  setSelectedFile,
  theme,
  timeout,
  uncollapsed,
  useRootFolder,
}: FolderProps) {
  const {
    children: childrenProp,
    disabled: disabledProp,
    name,
    parent: parentFile,
  } = file;

  if (!name && !allowEmptyFolders) {
    file.name = DEFAULT_NAME;
  }
  const filePathToUse: string = useRootFolder
    ? getFullPath(file)
    : getFullPathWithoutRootFolder(file);

  const isPipelineFolder = parentFile?.name === FOLDER_NAME_PIPELINES;
  const children = useMemo(() =>
    (childrenProp
      ? sortByKey(childrenProp, ({
          children: arr,
        }) => arr ? 0 : 1)
      : childrenProp
    ),
    [childrenProp],
  );

  const disabledColor = isFileDisabled
    ? isFileDisabled(filePathToUse, children)
    : (
      disabledProp
        // || name === '__init__.py'
        // || !!name?.match(/^\./)
        // || (!name.match(ALL_SUPPORTED_FILE_EXTENSIONS_REGEX) && !childrenProp)
    );

  const disabled = isFileDisabled
    ? isFileDisabled(filePathToUse, children)
    : (
      disabledProp
        // || name === '__init__.py'
        // // Don’t disable hidden folders
        // || (!!name?.match(/^\./) && !children)
        // || (!name.match(ALL_SUPPORTED_FILE_EXTENSIONS_REGEX) && !childrenProp)
    );

  const uuid = `${level}/${name}`;
  const collapsedInit = (Array.isArray(children) && children?.length > 0)
    // Top level of project folders is initially uncollapsed, but the nested folders are collapsed.
    ? get(uuid, level > 1)
    : false;
  const [collapsed, setCollapsed] = useState<boolean>(typeof uncollapsed === 'undefined'
    ? collapsedInit
    : !uncollapsed,
  );

  let IconEl = FileFill;
  if (level === 1 && name === FOLDER_NAME_PIPELINES) {
    IconEl = Pipeline;
  } else if (name === FOLDER_NAME_CHARTS) {
    IconEl = NavGraph;
  } else if (children) {
    IconEl = FolderIcon;
  } else if (!name && allowEmptyFolders) {
    IconEl = Ellipsis;
  }

  let color;
  if (children && BLOCK_TYPES.includes(singularize(name)) && singularize(name) !== BlockTypeEnum.CHART) {
    color = getColorsForBlockType(singularize(name), { theme }).accent;
  }

  const childrenFiles = useMemo(() => children?.map((f: FileType) => (
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
      key={`${uuid}/${f?.name || DEFAULT_NAME}`}
      level={onlyShowChildren ? level : level + 1}
      onClickFile={onClickFile}
      onClickFolder={onClickFolder}
      onSelectBlockFile={onSelectBlockFile}
      openFile={openFile}
      openPipeline={openPipeline}
      openSidekickView={openSidekickView}
      pipelineBlockUuids={pipelineBlockUuids}
      renderAfterContent={renderAfterContent}
      selectFile={selectFile}
      setContextItem={setContextItem}
      setCoordinates={setCoordinates}
      setDraggingFile={setDraggingFile}
      setSelectedFile={setSelectedFile}
      theme={theme}
      timeout={timeout}
      uncollapsed={uncollapsed}
      useRootFolder={useRootFolder}
    />
  )), [
    allowEmptyFolders,
    allowSelectingFolders,
    children,
    containerRef,
    disableContextMenu,
    file,
    isFileDisabled,
    level,
    onClickFile,
    onClickFolder,
    onSelectBlockFile,
    onlyShowChildren,
    openFile,
    openPipeline,
    openSidekickView,
    pipelineBlockUuids,
    renderAfterContent,
    selectFile,
    setContextItem,
    setCoordinates,
    setDraggingFile,
    setSelectedFile,
    theme,
    timeout,
    uncollapsed,
    useRootFolder,
    uuid,
  ]);

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
                setCollapsed((collapsedPrev) => {
                  set(uuid, !collapsedPrev);

                  return !collapsedPrev;
                });
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
            setSelectedFile(file);
          }}
          onMouseDown={(e) => {
            const block = file ? getBlockFromFile(file, null, true) : null;

            if (!containerRef?.current?.contains(e.target)
              || !block
              || children?.length >= 1
              || disableContextMenu
              || disabled
              || isPipelineFolder
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

            {children && !collapsed && <ChevronDown muted size={ICON_SIZE} />}
            {children && collapsed && <ChevronRight muted size={ICON_SIZE} />}
            {!children && <div style={{ width: ICON_SIZE }} />}

            <div
              style={{
                marginLeft: UNIT / 2,
                marginRight: UNIT / 2,
              }}
            >
              {!color && <IconEl disabled={disabledColor} size={ICON_SIZE} />}
              {color && (
                <Circle
                  color={color}
                  size={ICON_SIZE}
                  square
                />
              )}
            </div>

            <Text
              color={color}
              default={!color && !disabled}
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

      <div
        style={{
          display: collapsed ? 'none' : 'block',
        }}
      >
        {childrenFiles}
      </div>
    </>
  );
}

export default Folder;
