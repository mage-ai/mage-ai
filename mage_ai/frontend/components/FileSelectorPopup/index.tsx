import * as osPath from 'path';
import { useMemo, useState } from 'react';

import BlockType, { BlockLanguageEnum } from '@interfaces/BlockType';
import Button from '@oracle/elements/Button';
import FileBrowser from '@components/FileBrowser';
import FileType from '@interfaces/FileType';
import Flex from '@oracle/components/Flex';
import LabelWithValueClicker from '@oracle/components/LabelWithValueClicker';
import Text from '@oracle/elements/Text';
import dark from '@oracle/styles/themes/dark';
import { Close } from '@oracle/icons';
import {
  InputRowStyle,
  WindowHeaderStyle,
  WindowContainerStyle,
  WindowContentStyle,
  WindowFooterStyle,
} from './index.style';
import { UNIT } from '@oracle/styles/units/spacing';
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
  const [selectedFilePath, setSelectedFilePath] = useState<string>(null);

  const dbtModelFiles = useMemo(
    () => {
      const arr1 = find(files?.[0]?.children || [], ({ name }) => 'dbt' === name)?.children;
      const projects = [];

      arr1?.forEach((folder) => {
        const {
          children = [],
        } = folder;

        if (children.length >= 1) {
          projects.push({
            ...folder,
            children,
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
            {creatingNewDBTModel
              ? 'Create new dbt model'
              : 'Select dbt model or snapshot file'
            }
          </Text>
        </Flex>
        <Button
          iconOnly
          onClick={onClose}
        >
          <Close muted />
        </Button>
      </WindowHeaderStyle>

      {creatingNewDBTModel &&
        <>
          <InputRowStyle>
            <LabelWithValueClicker
              dynamicSizing
              inputValue={dbtModelName}
              label="Model name (cannot be changed):"
              labelColor={dark.accent.dbt}
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
              placeholder="Enter name"
              required
              stacked
              suffixValue={`.${BlockLanguageEnum.SQL}`}
              value={!isEditingName && dbtModelName}
            />
          </InputRowStyle>
          <InputRowStyle>
            <Text bold color={dark.accent.dbt}>
              Select folder location:
            </Text>
            <Text
              bold
              muted={!selectedFilePath}
            >
              {selectedFilePath
                ? `dbt${osPath.sep}${selectedFilePath}`
                : 'Choose folder below'
              }
            </Text>
          </InputRowStyle>
        </>
      }

      <WindowContentStyle>
        <FileBrowser
          allowSelectingFolders={creatingNewDBTModel}
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
          selectFile={setSelectedFilePath}
          uncollapsed
          useRootFolder
        />
      </WindowContentStyle>

      {creatingNewDBTModel &&
        <WindowFooterStyle>
          <Button
            backgroundColor={(!dbtModelName || !selectedFilePath)
              ? dark.monotone.grey500
              : dark.accent.dbt
            }
            disabled={!dbtModelName || !selectedFilePath}
            onClick={() => onOpenFile(selectedFilePath)}
            padding="6px 8px"
          >
            Create model
          </Button>
        </WindowFooterStyle>
      }
    </WindowContainerStyle>
  );
}

export default FileSelectorPopup;
