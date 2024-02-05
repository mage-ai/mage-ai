import * as osPath from 'path';
import { useCallback, useMemo, useState } from 'react';
import { useGlobalState } from '@storage/state';
import { useMutation } from 'react-query';

import BlockType from '@interfaces/BlockType';
import Button from '@oracle/elements/Button';
import CodeEditor from '@components/CodeEditor';
import ErrorsType from '@interfaces/ErrorsType';
import FileType, { FILE_EXTENSION_TO_LANGUAGE_MAPPING } from '@interfaces/FileType';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
import PipelineType from '@interfaces/PipelineType';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import api from '@api';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { buildFileExtensionRegExp } from '@components/FileEditor/utils';
import { dateFormatLongFromUnixTimestamp } from '@utils/date';
import { isJsonString } from '@utils/string';
import { onSuccess } from '@api/utils/response';
import { pauseEvent } from '@utils/events';
import { pushAtIndex } from '@utils/array';
import { isObject, selectEntriesWithValues } from '@utils/hash';

type FileVersionsProps = {
  onActionCallback?: (file: FileType, opts?: {
    blockUUID: string;
  }) => void;
  pipeline?: PipelineType;
  selectedBlock?: BlockType;
  selectedFilePath?: string;
  setErrors: (errors: ErrorsType) => void;
  width?: number;
};

function FileVersions({
  onActionCallback,
  pipeline,
  selectedBlock,
  selectedFilePath,
  setErrors,
  width,
}: FileVersionsProps) {
  const [, setApiReloads] = useGlobalState('apiReloads');

  const urlID = useMemo(() => selectedFilePath
    ? encodeURIComponent(selectedFilePath)
    : selectedBlock
      ? encodeURIComponent(`${selectedBlock?.type}/${selectedBlock?.uuid}`)
      : null,
  [
    selectedBlock,
    selectedFilePath
  ]);

  const { data: dataFileVersions1, mutate: fetchFileVersions1 } =
    api.file_versions.files.list(urlID,
    selectEntriesWithValues({
      block_uuid: selectedBlock?.uuid,
      pipeline_uuid: pipeline?.uuid,
    }),
  );
  const fileVersions: FileType[] = useMemo(() => dataFileVersions1?.file_versions || [], [
    dataFileVersions1,
  ]);

  const [selectedFileVersionIndex, setSelectedFileVersionIndex] = useState<number>(null);
  const selectedFileVersion: FileType = useMemo(() => fileVersions?.[selectedFileVersionIndex], [
    selectedFileVersionIndex,
    fileVersions,
  ]);

  const { data: dataFileContent } = api.file_contents.detail(selectedFileVersion
    ? encodeURIComponent(selectedFileVersion.path)
    : null,
  );
  const fileContent: FileType = useMemo(() => dataFileContent?.file_content, [
    dataFileContent,
  ]);

  const regex = useMemo(() => buildFileExtensionRegExp(), []);
  const fileExtension = useMemo(() => ((typeof selectedFilePath !== 'string' && isObject(selectedFilePath))
    ? (selectedFilePath as FileType)?.path || (selectedFilePath as FileType)?.name
    : selectedFilePath
  )?.match(regex)?.[0]?.split('.')?.[1], [
    selectedFilePath,
    regex,
  ]);

  const [updateFileOrig, { isLoading }] = useMutation(
    api.file_contents.useUpdate(urlID),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: (resp) => {
            if (selectedFilePath) {
              fetchFileVersions1();
            }

            const fileContentPath = resp?.file_content?.path;
            let key = `FileEditor/${fileContentPath}`;

            if (fileContentPath) {
              const parts = fileContentPath.split(osPath.sep);
              if ('pipelines' === parts[0]) {
                const pipelineUUID = parts.slice(1, parts.length - 1).join(osPath.sep);
                key = `PipelineDetail/${pipelineUUID}`;
              }
            }

            setApiReloads(prev => ({
              ...prev,
              [key]: Number(new Date()),
            }));

            setSelectedFileVersionIndex(prev => prev + 1);
            onActionCallback?.(resp?.file_content, {
              blockUUID: selectedBlock?.uuid,
            });
          },
          onErrorCallback: (response, errors) => setErrors({
            errors,
            response,
          }),
        },
      ),
    },
  );

  const updateFile = useCallback((data: {
    version: string;
  }) => {
    const payload: {
      block_uuid?: string;
      pipeline_uuid?: string;
      version: string;
    } = {
      ...data,
    };

    if (!selectedFilePath) {
      payload.block_uuid = selectedBlock?.uuid;
      payload.pipeline_uuid = pipeline?.uuid;
    }

    // @ts-ignore
    return updateFileOrig({
      file_content: payload,
    });
  }, [
    pipeline,
    selectedBlock,
    selectedFilePath,
    updateFileOrig,
  ]);

  const rowsMemo = useMemo(() => {
    let arr = fileVersions.map((file: FileType) => {
      const {
        name,
        path,
      } = file;

      return [
        <FlexContainer alignItems="center" justifyContent="space-between" key={name}>
          <Flex flex={1}>
            <Text default monospace>
              {dateFormatLongFromUnixTimestamp(name, { withSeconds: true })}
            </Text>
            <Spacing px={PADDING_UNITS * 2}>
              <Text monospace>
                {name}
              </Text>
            </Spacing>
          </Flex>

          {selectedFileVersion && selectedFileVersion?.path === path && (
            <Button
              compact
              loading={isLoading}
              onClick={(e) => {
                pauseEvent(e);
                // @ts-ignore
                updateFile({
                  version: name,
                });
              }}
              small
            >
              Replace with this version
            </Button>
          )}
        </FlexContainer>,
      ];
    });

    if (selectedFileVersion) {
      let el = (
        <Spacing p={PADDING_UNITS}>
          <Spinner key="spinner" />
        </Spacing>
      );

      if (fileContent && fileContent?.path?.includes(selectedFileVersion?.path)) {
        const { content = '' } = fileContent;
        el = (
          <CodeEditor
            autoHeight
            language={FILE_EXTENSION_TO_LANGUAGE_MAPPING[fileExtension]}
            padding={UNIT * 2}
            readOnly
            value={isJsonString(content)
              ? JSON.stringify(JSON.parse(content), null, 2)
              : content
            }
            width={width}
          />
        );
      }

      arr = pushAtIndex([
        el,
      ], selectedFileVersionIndex + 1, arr);
    }

    return arr;
  }, [
    fileContent,
    fileExtension,
    fileVersions,
    isLoading,
    selectedFileVersion,
    selectedFileVersionIndex,
    updateFile,
    width,
  ]);

  return (
    <div style={{ width }}>
      <Spacing p={PADDING_UNITS}>
        <Headline level={5}>
          File versions
        </Headline>
        <Text inline monospace>
          {selectedFilePath
            ? decodeURIComponent(selectedFilePath)
            : selectedBlock?.uuid
          }
        </Text>
      </Spacing>

      <Table
        buildRowProps={(rowIndex: number) => {
          if (selectedFileVersion && selectedFileVersionIndex + 1 === rowIndex) {
            return {
              renderCell: cell => cell,
              renderRow: cells => cells,
            };
          }
        }}
        columnFlex={[1]}
        columns={[
          {
            uuid: 'Version',
          },
        ]}
        isSelectedRow={(rowIndex: number) =>
          fileVersions[rowIndex]?.name === selectedFileVersion?.name
        }
        onClickRow={(rowIndex: number) => {
          if (selectedFileVersion) {
            if (rowIndex === selectedFileVersionIndex) {
              setSelectedFileVersionIndex(null);
            } else if (rowIndex < selectedFileVersionIndex) {
              setSelectedFileVersionIndex(rowIndex);
            } else if (rowIndex > selectedFileVersionIndex + 1) {
              setSelectedFileVersionIndex(rowIndex - 1);
            }
          } else {
            setSelectedFileVersionIndex(rowIndex);
          }
        }}
        rows={rowsMemo}
      />
    </div>
  );
}

export default FileVersions;
