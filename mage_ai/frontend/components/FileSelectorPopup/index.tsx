import * as osPath from 'path';
import { useMemo, useState } from 'react';

import BlockType, { BlockLanguageEnum, BlockTypeEnum } from '@interfaces/BlockType';
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
import { find, indexBy } from '@utils/array';

type FileSelectorPopupProps = {
  blocks: BlockType[];
  children: any;
  creatingNewDBTModel?: boolean;
  dbtModelName?: string;
  onClose: () => void;
  setDbtModelName?: (name: string) => void;
};

function FileSelectorPopup({
  blocks,
  children,
  dbtModelName,
  onClose,
  setDbtModelName,
}: FileSelectorPopupProps) {
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [selectedFilePath, setSelectedFilePath] = useState<string>(null);

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
            Select dbt model or snapshot file
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
        {children}
      </WindowContentStyle>
    </WindowContainerStyle>
  );
}

export default FileSelectorPopup;
