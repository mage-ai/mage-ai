import React, { useContext } from 'react';
import { ThemeContext } from 'styled-components';

import FileType from '@interfaces/FileType';
import Folder, { FolderSharedProps } from './Folder';
import { ContainerStyle } from './index.style';

type FileBrowserProps = {
  files: FileType[];
} & FolderSharedProps;

function FileBrowser({
  files,
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
          theme={themeContext}
        />
      ))}
    </ContainerStyle>
  );
}

export default React.forwardRef(FileBrowser);
