import { useMemo, useState } from 'react';

import Circle from '@oracle/elements/Circle';
import FileType, {
  FOLDER_NAME_CHARTS,
  FOLDER_NAME_PIPELINES,
  SpecialFileEnum,
  SUPPORTED_FILE_EXTENSIONS_REGEX,
} from '@interfaces/FileType';
import Text from '@oracle/elements/Text';
import { BLOCK_TYPES, BlockTypeEnum } from '@interfaces/BlockType';
import {
  ChevronDown,
  ChevronRight,
  FileFill,
  Folder as FolderIcon,
  NavGraph,
  Pipeline,
} from '@oracle/icons';
import { ContextAreaProps } from '@components/ContextMenu';
import { FileContextEnum } from './index';
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
} from './utils';
import { singularize } from '@utils/string';
import { sortByKey } from '@utils/array';

export type FolderSharedProps = {
  onlyShowChildren?: boolean;
  onSelectBlockFile: (
    blockUUID: string,
    blockType: BlockTypeEnum,
    filePath: string,
  ) => void;
  openFile: (path: string) => void;
  openPipeline: (uuid: string) => void;
  openSidekickView: (newView: ViewKeyEnum, pushHistory?: boolean) => void;
};

type FolderProps = {
  file: FileType;
  level: number;
  pipelineBlockUuids: string[];
  theme: ThemeType;
} & FolderSharedProps & ContextAreaProps;

function Folder({
  file,
  level,
  onlyShowChildren,
  onSelectBlockFile,
  openFile,
  openPipeline,
  openSidekickView,
  pipelineBlockUuids,
  setContextItem,
  theme,
}: FolderProps) {
  const {
    children: childrenProp,
    disabled: disabledProp,
    name,
    parent: parentFile,
  } = file;
  const disabled = disabledProp
    || name === '__init__.py'
    || !!name.match(/^\./);
  const isPipelineFolder = parentFile?.name === FOLDER_NAME_PIPELINES;
  const children = useMemo(() =>
    isPipelineFolder
      ? null
      : (
        childrenProp
          ? sortByKey(childrenProp, ({
            children: arr,
            name: nameChild,
          }) => name === FOLDER_NAME_PIPELINES
            ? nameChild
            : (arr ? 0 : 1))
          : childrenProp
      ),
    [
      childrenProp,
      isPipelineFolder,
    ],
  );
  const uuid = `${level}/${name}`;
  const fileUsedByPipeline = pipelineBlockUuids.includes(getBlockUUIDFromFile(file));
  const parentFolderName = parentFile?.name || '';
  const isEditableCodeBlock = BLOCK_TYPES.includes(singularize(parentFolderName));

  const [collapsed, setCollapsed] = useState<boolean>(get(uuid, false));

  let IconEl = FileFill;
  if ((isPipelineFolder && !disabled) || (level === 1 && name === FOLDER_NAME_PIPELINES)) {
    IconEl = Pipeline;
  } else if (name === FOLDER_NAME_CHARTS) {
    IconEl = NavGraph;
  } else if (children) {
    IconEl = FolderIcon;
  }

  let color;
  if (children && BLOCK_TYPES.includes(singularize(name)) && singularize(name) !== BlockTypeEnum.CHART) {
    color = getColorsForBlockType(singularize(name), { theme }).accent;
  }

  const childrenFiles = useMemo(() => children?.map((f: FileType) => (
    <Folder
      file={{
        ...f,
        parent: file,
      }}
      key={`${uuid}/${f.name}`}
      level={onlyShowChildren ? level : level + 1}
      onSelectBlockFile={onSelectBlockFile}
      openFile={openFile}
      openPipeline={openPipeline}
      openSidekickView={openSidekickView}
      pipelineBlockUuids={pipelineBlockUuids}
      setContextItem={setContextItem}
      theme={theme}
    />
  )), [
    children,
    openFile,
    openPipeline,
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
              openSidekickView(ViewKeyEnum.CHARTS);
              const block = getBlockFromFile(file);
              if (block) {
                onSelectBlockFile(
                  block.uuid,
                  block.type,
                  getFullPath(file).split('/').slice(1).join('/'),
                );
              }
            }

            if (isPipelineFolder) {
              openPipeline(name);
            } else if (children) {
              setCollapsed((collapsedPrev) => {
                set(uuid, !collapsedPrev);

                return !collapsedPrev;
              });
            } else if (name.match(SUPPORTED_FILE_EXTENSIONS_REGEX)) {
              // WARNING: this assumes the first part of a path is the default_repo
              openFile(getFullPath(file).split('/').slice(1).join('/'));
            } else {
              const block = getBlockFromFile(file);
              if (block) {
                onSelectBlockFile(
                  block.uuid,
                  block.type,
                  getFullPath(file).split('/').slice(1).join('/'),
                );
              }
            }
          }}
          onContextMenu={(e) => {
            e.preventDefault();

            if (disabled) {
              setContextItem({ type: FileContextEnum.DISABLED });
            } else if (isPipelineFolder) {
              setContextItem({
                data: {
                  name,
                },
                type: FileContextEnum.PIPELINE,
              });
            } else if (children) {
              setContextItem({ type: FileContextEnum.FOLDER });
            } else if (name.match(SUPPORTED_FILE_EXTENSIONS_REGEX) || name === SpecialFileEnum.INIT_PY) {
              setContextItem({ type: FileContextEnum.FILE });
            } else {
              setContextItem({
                data: {
                  block: getBlockFromFile(file),
                },
                type: FileContextEnum.BLOCK_FILE,
              });
            }
          }}
          style={{
            alignItems: 'center',
            cursor: 'default',
            display: 'flex',
            minWidth: (level * INDENT_WIDTH) + (file.name.length * WIDTH_OF_SINGLE_CHARACTER) + (UNIT * 2),
            paddingBottom: UNIT / 4,
            paddingLeft: (UNIT / 4) + (INDENT_WIDTH * level),
            paddingRight: (UNIT / 4),
            paddingTop: UNIT / 4,
          }}
        >
          {children && !collapsed && <ChevronDown muted size={ICON_SIZE} />}
          {children && collapsed && <ChevronRight muted size={ICON_SIZE} />}
          {!children && <div style={{ width: ICON_SIZE }} />}

          <div
            style={{
              marginLeft: UNIT / 2,
              marginRight: UNIT / 2,
            }}
          >
            {!color && <IconEl disabled={disabled} size={ICON_SIZE} />}
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
            disabled={disabled || (isEditableCodeBlock && !fileUsedByPipeline)}
            italic={isEditableCodeBlock && !fileUsedByPipeline && name !== SpecialFileEnum.INIT_PY}
            monospace
            small
          >
            {name}
          </Text>
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
