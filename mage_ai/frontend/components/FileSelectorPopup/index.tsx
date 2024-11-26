import BlockType, { BlockTypeEnum } from '@interfaces/BlockType';
import Button from '@oracle/elements/Button';
import Flex from '@oracle/components/Flex';
import Text from '@oracle/elements/Text';
import useFileComponents from '@components/Files/useFileComponents';
import { Close } from '@oracle/icons';
import {
  WindowHeaderStyle,
  WindowContainerStyle,
  WindowContentStyle,
} from './index.style';

type FileSelectorPopupProps = {
  onClose: () => void;
  onOpenFile?: (filePath: string, isFolder: boolean) => void;
  onSelectBlockFile?: (
    blockUUID: string,
    blockType: BlockTypeEnum,
    filePath: string,
  ) => void;
};

function FileSelectorPopup({
  onClose,
  onOpenFile,
  onSelectBlockFile,
}: FileSelectorPopupProps) {
  const {
    browser: fileBrowser,
  } = useFileComponents({
    allowDbtModelSelect: true,
    disableContextMenu: true,
    onOpenFile,
    onSelectBlockFile,
    query: {
      pattern: encodeURIComponent('\\.sql$'),
    },
    uuid: 'FileSelectorPopup/dbt',
  });

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
        {fileBrowser}
      </WindowContentStyle>
    </WindowContainerStyle>
  );
}

export default FileSelectorPopup;
