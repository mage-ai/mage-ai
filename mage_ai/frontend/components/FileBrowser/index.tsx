import React, { useContext } from 'react';
import { ThemeContext } from 'styled-components';

import FileType from '@interfaces/FileType';
import Folder, { FolderSharedProps } from './Folder';
import { ContainerStyle } from './index.style';
import { ContextAreaProps } from '@components/ContextMenu';

type FileBrowserProps = {
  files: FileType[];
} & FolderSharedProps & ContextAreaProps;

export enum FileContextEnum {
  BLOCK_FILE = 'block_file',
  DISABLED = 'disabled',
  FILE = 'file',
  FOLDER = 'folder',
  PIPELINE = 'pipeline',
}

function FileBrowser({
  files,
  setContextItem,
  ...props
}: FileBrowserProps, ref) {
  const themeContext = useContext(ThemeContext);

  return (
    <ContainerStyle ref={ref}>
      {files?.map((file: FileType) => (
        <Folder
          {...props}
          file={file}
          key={file.name}
          level={0}
          setContextItem={setContextItem}
          theme={themeContext}
        />
      ))}
    </ContainerStyle>
  );
}

export default React.forwardRef(FileBrowser);
