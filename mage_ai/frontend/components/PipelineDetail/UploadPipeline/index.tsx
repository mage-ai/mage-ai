import router from 'next/router';
import { useMemo, useState } from 'react';

import ApiErrorType from '@interfaces/ApiErrorType';
import Button from '@oracle/elements/Button';
import FileUploader from '@components/FileUploader';
import FileType from '@interfaces/FileType';
import FlexContainer from '@oracle/components/FlexContainer';
import Panel from '@oracle/components/Panel';
import PopupMenu from '@oracle/components/PopupMenu';
import ProgressBar from '@oracle/components/ProgressBar';   
import Spacing from '@oracle/elements/Spacing';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import ToggleSwitch from '@oracle/elements/Inputs/ToggleSwitch';
import { DropZoneStyle, TableStyle } from '@components/FileBrowser/UploadFiles/index.style';
import { isEmptyObject } from '@utils/hash';
import { sortByKey } from '@utils/array';
import { UNIT } from '@oracle/styles/units/spacing';
import { useModal } from '@context/Modal';

type UploadPipelineProps = {
  fetchPipelines?: () => void;
  onCancel: () => void;
};

function UploadPipeline({
  fetchPipelines,
  onCancel,
}: UploadPipelineProps) {
  const [overwritePipeline, setOverwritePipeline] = useState<boolean>(false);
  const [isDragActive, setIsDragActive] = useState<boolean>(false);
  const [fileUploadProgress, setFileUploadProgress] = useState<{
    [key: string]: number;
  }>({});
  const [uploadedPipeline, setUploadedPipeline] = useState<{
    [key: string]: ApiErrorType & FileType;
  }>({});
  const hasFiles: boolean = !isEmptyObject(fileUploadProgress);

  const [showPopupMenu] = useModal(() => {
    const pipeline: ApiErrorType & FileType = Object.values(uploadedPipeline)[0];
    const errorMessage = pipeline?.message;
    const error = !!errorMessage;

    // inverted confirm and cancel buttons because Popup component cannot hide confirm
    return <PopupMenu
          cancelText={!error ? `Edit ${pipeline?.name}` : null}
          centerOnScreen
          confirmText="Close"
          danger={error}
          neutral={!error}
          onCancel={error ? undefined : () => router.push(
            '/pipelines/[pipeline]/edit',
            `/pipelines/${pipeline?.name}/edit`,
          )}
          onClick={ () => onCancel() }
          subtitle={error ? errorMessage : `Pipeline ${pipeline?.name} successfully imported!`}
          title={error ? 'Error on pipeline import.' : 'Successful import!'}
          width={UNIT * 50}
    />;
      }, {
  }, [
    uploadedPipeline,
  ], {
    background: true,
    uuid: 'confirm_upload',
  });

  const tableMemo = useMemo(() => {
    const rows = [];
    sortByKey(Object.entries(fileUploadProgress), ([name, _]) => name).forEach(([
      filename,
      progress,
    ]) => {
      const file: ApiErrorType & FileType = uploadedPipeline[filename];
      const errorMessage = file?.message;

      rows.push([
        <div key={`name-${filename}`}>
          <Text
            overflowWrap
            preWrap
          >
            {filename}
          </Text>
          {errorMessage && (
            <Spacing mt={1}>
              <Text danger small>
                {errorMessage}
              </Text>
            </Spacing>
          )}
        </div>,
        <ProgressBar
          danger={!!errorMessage}
          key={`progress-${filename}`}
          progress={progress * 100}
        />,
      ]);
    });

    return (
      <Table
        columnFlex={[1, 4]}
        columns={[
          {
            uuid: 'Filename',
          },
          {
            uuid: 'Upload progress',
          },
        ]}
        rows={rows}
        uuid="block-runs"
      />
    );
  }, [fileUploadProgress, uploadedPipeline]);

  return (
    <Panel
      footer={(
        <FlexContainer fullWidth justifyContent="space-between">
          <Button onClick={() => onCancel()}>
            Close
          </Button>
          <Spacing ml={1}>
            <FlexContainer alignItems="center" justifyContent="flex-end">
              <Text>Overwrite pipeline files</Text>
              <Spacing ml={1}/>
              <ToggleSwitch
                checked={overwritePipeline}
                onCheck={setOverwritePipeline}
              />
            </FlexContainer>
          </Spacing>
        </FlexContainer>
      )}
      headerTitle="Import pipeline from .zip file"
    >
      {hasFiles && (
        <TableStyle>
          {tableMemo}
        </TableStyle>
      )}

      {!hasFiles && (
        <FileUploader
          directoryPath={null} // no directory needs to be specified in case of pipeline imports
          onDragActiveChange={setIsDragActive}
          overwrite={overwritePipeline}
          pipelineZip={true}
          setFileUploadProgress={setFileUploadProgress}
          setUploadedFiles={(uploadedFiles) => {
            // @ts-ignore
            setUploadedPipeline(uploadedFiles);
            showPopupMenu();
            fetchPipelines?.();
          }}
        >
          <DropZoneStyle>
            <Text center>
              {isDragActive && 'Drop pipeline zip to import'}
              {!isDragActive && 'Click or drop pipeline zip to upload'}
            </Text>
          </DropZoneStyle>
          <Spacing mt={2}>
            <Text warning>
              The zip file should include the pipeline’s metadata.yaml file and each 
              <br />
              block’s script file in the root folder.
            </Text>
          </Spacing>
        </FileUploader>
      )}
    </Panel>
  );
}

export default UploadPipeline;
