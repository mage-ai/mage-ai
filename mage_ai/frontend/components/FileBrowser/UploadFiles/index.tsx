import { useState } from 'react';

import Button from '@oracle/elements/Button';
import FileType from '@interfaces/FileType';
import FileUploader from '@components/FileUploader';
import FlexContainer from '@oracle/components/FlexContainer';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import Panel from '@oracle/components/Panel';
import Text from '@oracle/elements/Text';
import { getFullPathWithoutRootFolder } from '../utils';

type UploadFilesProps = {
  onCancel: () => void;
  selectedFolder: FileType;
};

function UploadFiles({
  onCancel,
  selectedFolder,
}: UploadFilesProps) {
  // setFileUploadProgress
  // setUploadedFiles

  return (
    <Panel
      headerTitle="Upload files"
      footer={(
        <FlexContainer>
          <Button
            primary
          >
            Upload files
          </Button>

          <Spacing mr={1} />

          <Button>
            Cancel
          </Button>
        </FlexContainer>
      )}
    >
      <FileUploader
        directoryPath={selectedFolder ? getFullPathWithoutRootFolder(selectedFolder) : ''}
        // setFileUploadProgress
        // setUploadedFiles
      >
      </FileUploader>

    </Panel>
  );
}

export default UploadFiles;
