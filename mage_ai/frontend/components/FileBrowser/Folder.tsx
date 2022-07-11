import { useMemo, useState } from 'react';

import Circle from '@oracle/elements/Circle';
import FileType, {
  FOLDER_NAME_PIPELINES,
  SUPPORTED_FILE_EXTENSIONS_REGEX,
} from '@interfaces/FileType';
import FlexContainer from '@oracle/components/FlexContainer';
import Text from '@oracle/elements/Text';
import { BLOCK_TYPES, BlockTypeEnum } from '@interfaces/BlockType';
import {
  ChevronDown,
  ChevronRight,
  FileFill,
  Folder as FolderIcon,
  Pipeline,
} from '@oracle/icons';
import {
  ICON_SIZE,
  INDENT_WIDTH,
} from './index.style';
import { ThemeType } from '@oracle/styles/themes/constants';
import { UNIT, WIDTH_OF_SINGLE_CHARACTER } from '@oracle/styles/units/spacing';
import { get, set } from '@storage/localStorage';
import { getColorsForBlockType } from '@components/CodeBlock/index.style';
import {
  getBlockFromFile,
  getFullPath,
} from './utils';
import { pauseEvent } from '@utils/events';
import { singularize } from '@utils/string';
import { sortByKey } from '@utils/array';

export type FolderSharedProps = {
  onSelectBlockFile: (
    blockUUID: string,
    blockType: BlockTypeEnum,
    filePath: string,
  ) => void;
  openFile: (path: string) => void;
  openPipeline: (uuid: string) => void;
};

type FolderProps = {
  file: FileType;
  level: number;
  theme: ThemeType;
} & FolderSharedProps;

function Folder({
  file,
  level,
  onSelectBlockFile,
  openFile,
  openPipeline,
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

  const [collapsed, setCollapsed] = useState<boolean>(get(uuid, false));

  let IconEl = FileFill;
  if (isPipelineFolder && !disabled) {
    IconEl = Pipeline;
  } else if (children) {
    IconEl = FolderIcon;
  }

  let color;
  if (children && BLOCK_TYPES.includes(singularize(name))) {
    color = getColorsForBlockType(singularize(name), { theme }).accent;
  }

  const childrenFiles = useMemo(() => children?.map((f: FileType) => (
    <Folder
      file={{
        ...f,
        parent: file,
      }}
      key={`${uuid}/${f.name}`}
      level={level + 1}
      onSelectBlockFile={onSelectBlockFile}
      openFile={openFile}
      openPipeline={openPipeline}
      theme={theme}
    />
  )), [
    children,
    openFile,
    openPipeline,
  ]);

  return (
    <>
      <div
        className="row"
        onClick={(e) => {
          pauseEvent(e);

          if (disabled) {
            return;
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
          monospace
          disabled={disabled}
          small
        >
          {name}
        </Text>
      </div>

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
