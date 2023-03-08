import { useMemo } from 'react';

import BlockType from '@interfaces/BlockType';
import FileType from '@interfaces/FileType';
import Headline from '@oracle/elements/Headline';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import api from '@api';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';

type FileVersionsProps = {
  selectedBlock?: BlockType;
  selectedFilePath?: string;
  width: number;
};

function FileVersions({
  selectedBlock,
  selectedFilePath,
  width,
}: FileVersionsProps) {
  const { data: dataFileVersions1 } =
    api.file_versions.files.list(selectedFilePath && encodeURIComponent(selectedFilePath));

  const fileVersions: FileType[] = useMemo(() => dataFileVersions1?.file_versions || [], [
    dataFileVersions1,
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
    </div>
  );
}

export default FileVersions;
