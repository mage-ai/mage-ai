import * as osPath from 'path';
import { useCallback } from 'react';
import { useMutation } from 'react-query';

import ApiErrorType from '@interfaces/ApiErrorType';
import FileType from '@interfaces/FileType';
import MultiFileInput from '@oracle/elements/Inputs/MultiFileInput';
import UploadFileType from '@interfaces/UploadFileType';
import api from '@api';

type FileUploaderProps = {
  children: any;
  directoryPath: string;
  pipelineZip?: boolean;
  overwrite?: boolean;
  onDragActiveChange?: (isDragActive: boolean) => void;
  setFileUploadProgress?: (opts: {
    [path: string]: number;
  }) => void;
  setUploadedFiles: (opts: {
    [path: string]: ApiErrorType | FileType;
  }) => void;
};

function FileUploader({
  children,
  directoryPath,
  pipelineZip = false,
  overwrite = false,
  onDragActiveChange,
  setFileUploadProgress,
  setUploadedFiles,
}: FileUploaderProps) {
  const [createFile] = useMutation(
    api.files.useCreate({
      onUploadProgress: (event, { body }) => {
        const parts = [
          body?.dir_path,
          body?.file?.name,
          body?.pipelineZip,
        ];
        const fileFullPath = parts.filter(s => s?.length >= 1).join(osPath.sep);
        // @ts-ignore
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
      const parts = [directoryPath];
      const pathClean = path.split(osPath.sep).filter(p => p && p !== name).join(osPath.sep);
      if (pathClean) {
        parts.push(pathClean);
      }

      const parts2 = [];
      const dirPath = parts.join(osPath.sep);
      if (dirPath?.length >= 1) {
        parts.push(dirPath);
      }
      parts2.push(name);
      const fileFullPath = parts2.join(osPath.sep);

      // @ts-ignore
      createFile({
        dir_path: dirPath,
        file: file,
        pipeline_zip: pipelineZip,
        overwrite: overwrite,
      }).then(({
        data,
      }) => {
        const {
          error,
          file: fileFromServer,
        } = data;
        // @ts-ignore
        setUploadedFiles((prev: {
          [path: string]: ApiErrorType | FileType;
        }) => ({
          ...prev,
          [fileFullPath]: fileFromServer || error,
        }));
      });

      // @ts-ignore
      setFileUploadProgress((prev: {
        [path: string]: number;
      }) => ({
        ...prev,
        [fileFullPath]: 0,
      }));
    });
  }, [
    createFile,
    directoryPath,
    overwrite,
    setFileUploadProgress,
    setUploadedFiles,
    pipelineZip,
  ]);

  return (
    <MultiFileInput
      // @ts-ignore
      onDragActiveChange={onDragActiveChange}
      setFiles={setFiles}
    >
      {children}
    </MultiFileInput>
  );
}

export default FileUploader;
