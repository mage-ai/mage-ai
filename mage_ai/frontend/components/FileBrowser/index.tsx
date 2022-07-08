import { ThemeContext } from 'styled-components';
import { useContext } from 'react';

import FileType from '@interfaces/FileType';
import Folder, { FolderSharedProps } from './Folder';
import { ContainerStyle } from './index.style';

type FileBrowserProps = {
  files: FileType[];
} & FolderSharedProps;

function FileBrowser({
  files,
  ...props
}: FileBrowserProps) {
  const themeContext = useContext(ThemeContext);

  return (
    <ContainerStyle>
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

export default FileBrowser;
