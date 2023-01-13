import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { ThemeContext } from 'styled-components';
import { useRouter } from 'next/router';

import BlockType, { BlockTypeEnum } from '@interfaces/BlockType';
import FileType from '@interfaces/FileType';
import FlyoutMenu from '@oracle/components/FlyoutMenu';
import Folder, { FolderSharedProps } from './Folder';
import { ContainerStyle } from './index.style';
import { ContextAreaProps } from '@components/ContextMenu';
import { HEADER_Z_INDEX } from '@components/constants';
import { UNIT } from '@oracle/styles/units/spacing';
import { getBlockFromFile } from './utils';

const MENU_WIDTH: number = UNIT * 20;

type FileBrowserProps = {
  blocks?: BlockType[];
  deleteBlockFile?: (b: BlockType) => void;
  deleteWidget?: (b: BlockType) => void;
  files?: FileType[];
  widgets?: BlockType[];
} & FolderSharedProps & ContextAreaProps;

export enum FileContextEnum {
  BLOCK_FILE = 'block_file',
  DISABLED = 'disabled',
  FILE = 'file',
  FOLDER = 'folder',
  PIPELINE = 'pipeline',
}

function FileBrowser({
  blocks = [],
  deleteBlockFile,
  deleteWidget,
  files,
  widgets = [],
  ...props
}: FileBrowserProps, ref) {
  const themeContext = useContext(ThemeContext);
  const [coordinates, setCoordinates] = useState<{
    x: number;
    y: number;
  }>(null);
  const [selectedFile, setSelectedFile] = useState<FileType>(null);

  const handleClick = useCallback(() => setSelectedFile(null), [setSelectedFile]);

  useEffect(() => {
    document.addEventListener('click', handleClick);
    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, []);

  const pipelineBlockUuids = useMemo(() => blocks.concat(widgets).map(({ uuid }) => uuid), [
    blocks,
    widgets,
  ]);

  const filesMemo = useMemo(() => files?.map((file: FileType) => (
    <Folder
      {...props}
      containerRef={ref}
      file={file}
      key={file.name}
      level={0}
      pipelineBlockUuids={pipelineBlockUuids}
      setCoordinates={setCoordinates}
      setSelectedFile={setSelectedFile}
      theme={themeContext}
    />
  )), [
    files,
    pipelineBlockUuids,
    ref,
    themeContext,
  ]);

  const selectedBlock = useMemo(() => selectedFile && getBlockFromFile(selectedFile), [
    selectedFile,
  ]);

  const menuMemo = useMemo(() => {
    if (!selectedBlock) {
      return <div />;
    }

    const {
      x: xContainer,
      width,
    } = ref?.current?.getBoundingClientRect() || {};
    const {
      x = 0,
      y = 0,
    } = coordinates || {};
    let xFinal = x;
    if (x + MENU_WIDTH >= xContainer + width) {
      xFinal = (xContainer + width) - (MENU_WIDTH + UNIT);
    }
    if (xFinal < 0) {
      xFinal = 0;
    }

    return (
      <div
        style={{
          left: xFinal,
          position: 'fixed',
          top: y + (UNIT / 2),
          zIndex: HEADER_Z_INDEX + 100,
        }}
      >
        <FlyoutMenu
          items={[
            {
              label: () => 'Delete file',
              onClick: () => {
                if (selectedBlock.type === BlockTypeEnum.CHART) {
                  deleteWidget(selectedBlock);
                } else {
                  deleteBlockFile(selectedBlock);
                }
              },
              uuid: 'delete_file',
            },
          ]}
          open
          parentRef={undefined}
          uuid="FileBrowser/ContextMenu"
          width={MENU_WIDTH}
        />
      </div>
    );
  }, [
    coordinates,
    ref,
    selectedBlock,
  ]);

  return (
    <ContainerStyle ref={ref}>
      {filesMemo}

      {selectedBlock && menuMemo}
    </ContainerStyle>
  );
}

export default React.forwardRef(FileBrowser);
