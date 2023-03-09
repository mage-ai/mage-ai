import { useMemo, useState } from 'react';

import BlockType from '@interfaces/BlockType';
import Button from '@oracle/elements/Button';
import CodeEditor from '@components/CodeEditor';
import FileType, { FILE_EXTENSION_TO_LANGUAGE_MAPPING } from '@interfaces/FileType';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import api from '@api';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';
import { buildFileExtensionRegExp } from '@components/FileEditor/utils';
import { dateFormatLongFromUnixTimestamp } from '@utils/date';
import { isJsonString } from '@utils/string';
import { pushAtIndex } from '@utils/array';

type FileVersionsProps = {
  onClickRowAction: (file: FileType) => void;
  selectedBlock?: BlockType;
  selectedFilePath?: string;
  width: number;
};

function FileVersions({
  onClickRowAction,
  selectedBlock,
  selectedFilePath,
  width,
}: FileVersionsProps) {
  const { data: dataFileVersions1 } =
    api.file_versions.files.list(selectedFilePath && encodeURIComponent(selectedFilePath));
  const fileVersions: FileType[] = useMemo(() => dataFileVersions1?.file_versions || [], [
    dataFileVersions1,
  ]);

  const [selectedFileVersionIndex, setSelectedFileVersionIndex] = useState<number>(null);
  const selectedFileVersion: FileType = useMemo(() => fileVersions?.[selectedFileVersionIndex], [
    selectedFileVersionIndex,
    fileVersions,
  ]);

  const { data: dataFileContent } = api.file_contents.detail(selectedFileVersion
    ?  encodeURIComponent(selectedFileVersion.path)
    : null,
  );
  const fileContent: FileType = useMemo(() => dataFileContent?.file_content, [
    dataFileContent,
  ]);

  const regex = useMemo(() => buildFileExtensionRegExp(), []);
  const fileExtension = useMemo(() => fileContent?.path?.match(regex)?.[0]?.split('.')?.[1], [
    fileContent,
    regex,
  ]);

  const rowsMemo = useMemo(() => {
    let arr = fileVersions.map((file: FileType) => {
      const {
        name,
      } = file;

      return [
        <FlexContainer alignItems="center" justifyContent="space-between" key={name}>
          <Flex flex={1}>
            <Text default monospace>
              {dateFormatLongFromUnixTimestamp(name, { withSeconds: true })}
            </Text>
            <Spacing px={PADDING_UNITS}>
              <Text monospace>
                {name}
              </Text>
            </Spacing>
          </Flex>

          <Button
            compact
            onClick={() => onClickRowAction(file)}
            small
          >
            Replace with this version
          </Button>
        </FlexContainer>,
      ];
    });

    if (selectedFileVersion) {
      let el = <Spinner key="spinner" />;

      if (fileContent?.path === selectedFileVersion?.path && fileContent?.content) {
        const { content } = fileContent;
        el = (
          <CodeEditor
            autoHeight
            language={FILE_EXTENSION_TO_LANGUAGE_MAPPING[fileExtension]}
            padding
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
    onClickRowAction,
    selectedFileVersion,
    selectedFileVersionIndex,
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
              renderCell: (cell, colIndex: number) => cell,
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
