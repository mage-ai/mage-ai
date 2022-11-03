import { useMemo } from 'react';

import BlockType, { BlockLanguageEnum } from '@interfaces/BlockType';
import Button from '@oracle/elements/Button';
import FileBrowser from '@components/FileBrowser';
import FileType from '@interfaces/FileType';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Text from '@oracle/elements/Text';
import { Close } from '@oracle/icons';
import {
  WindowHeaderStyle,
  WindowContainerStyle,
  WindowContentStyle,
} from './index.style';
import { find, indexBy } from '@utils/array';

type FileSelectorPopupProps = {
  blocks: BlockType[];
  files: FileType[];
  onClose: () => void;
  onOpenFile: (filePath: string) => void;
};

function FileSelectorPopup({
  blocks,
  files,
  onClose,
  onOpenFile,
}: FileSelectorPopupProps) {
  const dbtModelFiles = useMemo(
    () => {
      const arr1 = find(files?.[0]?.children || [], ({ name }) => 'dbt' === name)?.children;
      const projects = [];

      arr1?.forEach((folder) => {
        const {
          children = [],
        } = folder;
        const modelsFolders = children.filter(({ name }) => 'models' === name);

        if (modelsFolders.length >= 1) {
          projects.push({
            ...folder,
            children: modelsFolders,
          });
        }
      });

      return projects;
    },
    [
      files,
    ],
  );
  const existingModelsByFilePath = useMemo(
    () => indexBy(blocks, ({ configuration }) => configuration.file_path),
    [blocks],
  );

  return (
    <WindowContainerStyle>
      <WindowHeaderStyle>
        <Flex alignItems="center">
          <Text
            disableWordBreak
            monospace
          >
            Select DBT model file
          </Text>
        </Flex>
        <Button
          iconOnly
          onClick={onClose}
        >
          <Close muted />
        </Button>
      </WindowHeaderStyle>

      <WindowContentStyle>
        <FileBrowser
          files={dbtModelFiles}
          isFileDisabled={(filePath: string, children) => {
            return !!existingModelsByFilePath[filePath]
              || (!children?.length &&
                !filePath.match(new RegExp(`\.${BlockLanguageEnum.SQL}\$`))
              );
          }}
          openFile={onOpenFile}
          uncollapsed
          useRootFolder
        />
      </WindowContentStyle>
    </WindowContainerStyle>
  );
}

export default FileSelectorPopup;
