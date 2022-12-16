import React, { useContext } from 'react';
import { ThemeContext } from 'styled-components';
import { useRouter } from 'next/router';

import BlockType from '@interfaces/BlockType';
import FileType from '@interfaces/FileType';
import Folder, { FolderSharedProps } from './Folder';
import { ContainerStyle } from './index.style';
import { ContextAreaProps } from '@components/ContextMenu';

type FileBrowserProps = {
  blocks?: BlockType[];
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
  files,
  widgets = [],
  ...props
}: FileBrowserProps, ref) {
  const themeContext = useContext(ThemeContext);
  const pipelineBlockUuids = blocks.concat(widgets).map(({ uuid }) => uuid);

  return (
    <ContainerStyle ref={ref}>
      {files?.map((file: FileType) => (
        <Folder
          {...props}
          file={file}
          key={file.name}
          level={0}
          pipelineBlockUuids={pipelineBlockUuids}
          theme={themeContext}
        />
      ))}
    </ContainerStyle>
  );
}

export default React.forwardRef(FileBrowser);
