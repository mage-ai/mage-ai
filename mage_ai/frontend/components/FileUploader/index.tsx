import { useCallback } from 'react';
import { useMutation } from 'react-query';

import FileType from '@interfaces/FileType';
import MultiFileInput from '@oracle/elements/Inputs/MultiFileInput';
import UploadFileType from '@interfaces/UploadFileType';
import api from '@api';

type FileUploaderProps = {
  children: any;
  directoryPath: string;
  onDragActiveChange?: (isDragActive: boolean) => void;
  setFileUploadProgress?: (opts: {
    [path: string]: FileType;
  }) => void;
  setUploadedFiles: (opts: {
    [path: string]: number;
  }) => void;
};

function FileUploader({
  children,
  directoryPath,
  onDragActiveChange,
  setFileUploadProgress,
  setUploadedFiles,
}: FileUploaderProps) {
  const [createFile] = useMutation(
    api.files.useCreate({
      onUploadProgress: (event, { body }) => {
        const fileFullPath = `${body?.dir_path}/${body?.file?.name}`;
        setFileUploadProgress?.(prev => ({
          ...prev,
          [fileFullPath]: event.loaded / event.total,
        }));
      },
    }),
  );

  const setFiles = useCallback((files: UploadFileType[]) => {
    files.forEach((file: UploadFileType) => {
      const { name, path } = file;
      const pathClean = path.split('/').filter(p => p && p !== name).join('/');
      const dirPath = `${directoryPath}/${pathClean}`;
      const fileFullPath = `${dirPath}/${name}`;

      createFile({
        dir_path: dirPath,
        file: file,
        overwrite: false,
      }).then(({
        data,
      }) => {
        const {
          error,
          file: fileFromServer,
        } = data;
        setUploadedFiles(prev => ({
          ...prev,
          [fileFullPath]: fileFromServer || error,
        }));
      });

      setFileUploadProgress(prev => ({
        ...prev,
        [fileFullPath]: 0,
      }));
    });
  }, [
    createFile,
    directoryPath,
    setFileUploadProgress,
    setUploadedFiles,

  ]);

  return (
    <MultiFileInput
      onDragActiveChange={onDragActiveChange}
      setFiles={setFiles}
    >
      {children}
    </MultiFileInput>
  );
}

export default FileUploader;
