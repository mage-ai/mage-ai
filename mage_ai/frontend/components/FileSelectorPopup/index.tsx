import { useMemo, useState } from 'react';

import BlockType, { BlockLanguageEnum } from '@interfaces/BlockType';
import Button from '@oracle/elements/Button';
import FileBrowser from '@components/FileBrowser';
import FileType from '@interfaces/FileType';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import LabelWithValueClicker from '@oracle/components/LabelWithValueClicker';
import Spacing from '@oracle/elements/Spacing';
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
  creatingNewDBTModel?: boolean;
  dbtModelName?: string;
  files: FileType[];
  onClose: () => void;
  onOpenFile: (filePath: string) => void;
  setDbtModelName?: (name: string) => void;
};

function FileSelectorPopup({
  blocks,
  creatingNewDBTModel,
  dbtModelName,
  files,
  onClose,
  onOpenFile,
  setDbtModelName,
}: FileSelectorPopupProps) {
  const [isEditingName, setIsEditingName] = useState<boolean>(false);

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
            danger={creatingNewDBTModel && !dbtModelName}
            disableWordBreak
            monospace
          >
            {creatingNewDBTModel
              ? 'Enter name for dbt model'
              : 'Select DBT model file'
            }
          </Text>
          {creatingNewDBTModel &&
            <>
              <Spacing mx={1}>
                <LabelWithValueClicker
                  bold={false}
                  inputValue={dbtModelName}
                  monospace
                  muted
                  notRequired
                  onBlur={() => {
                    setIsEditingName(false);
                  }}
                  onChange={(e) => {
                    setDbtModelName(e.target.value);
                    e.preventDefault();
                  }}
                  onClick={() => {
                    setIsEditingName(true);
                  }}
                  onFocus={() => {
                    setIsEditingName(true);
                  }}
                  stacked
                  value={!isEditingName && dbtModelName}
                />
              </Spacing>
              <Text disableWordBreak monospace>
                and select file location:
              </Text>
            </>
          }
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
          allowOpeningFolders={creatingNewDBTModel}
          disableContextMenu
          files={dbtModelFiles}
          isFileDisabled={(filePath: string, children) => {
            if (creatingNewDBTModel) {
              return !children || children?.some(childFolder => childFolder?.name === 'models');
            }

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
