import type { FC } from 'react';
import { useCallback, useState } from 'react';

import { FilesList } from './FilesList';
import { TargetFileBox } from '../../Targets/TargetFileBox';

export const FilesContainer: FC = () => {
  console.log('FilesContainer render');
  const [droppedFiles, setDroppedFiles] = useState<File[]>([]);

  const handleFileDrop = useCallback(
    (item: { files: any[] }) => {
      if (item) {
        const files = item.files;
        setDroppedFiles(files);
      }
    },
    [setDroppedFiles],
  );

  return (
    <>
      <TargetFileBox onDrop={handleFileDrop} />
      <FilesList files={droppedFiles} />
    </>
  );
};
