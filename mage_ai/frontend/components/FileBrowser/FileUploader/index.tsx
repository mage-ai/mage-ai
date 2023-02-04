import { useCallback, useEffect, useState } from 'react';
import { useMutation } from 'react-query';

import MultiFileInput from '@oracle/elements/Inputs/MultiFileInput';
import Spacing from '@oracle/elements/Spacing';
import UploadFileType from '@interfaces/UploadFileType';
import api from '@api';
import { onSuccess } from '@api/utils/response';

function FileUploader() {
  const [files, setFiles] = useState<UploadFileType[]>([]);

  const [createFile, { isLoading }] = useMutation(
    api.files.useCreate(),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: (resp) => {
            console.log(resp);
          },
        },
      ),
    },
  );

  console.log(files);

  return (
    <>
      <MultiFileInput
        setFiles={(files: UploadFileType[]) => {
          const file = files[0];

          createFile({
            dir_path: 'test_files',
            file: file,
          });
        }}
      >
        <Spacing p={40}>

        </Spacing>
      </MultiFileInput>
    </>
  );
}

export default FileUploader;
