import { useMemo, useRef, useState } from 'react';

import FlyoutMenuWrapper from '@oracle/components/FlyoutMenu/FlyoutMenuWrapper';
import ExtensionOptionType, {
  ExtensionOptionTemplateType,
  ExtensionTypeEnum,
} from '@interfaces/ExtensionOptionType';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import { Add } from '@oracle/icons';
import { BlockTypeEnum } from '@interfaces/BlockType';
import { ExtensionProps } from '../constants';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';

type GreatExpectationsProps = {
  extensionOption: ExtensionOptionType;
} & ExtensionProps;

function GreatExpectations({
  addNewBlockAtIndex,
  extensionOption,
  pipeline,
}: GreatExpectationsProps) {
  const refParent = useRef(null);
  const [dropdownMenuVisible, setDropdownMenuVisible] = useState<boolean>(false);
  const {
    uuid: extensionUUID,
  } = extensionOption || {};
  const {
    blocks,
    extensions,
  } = pipeline || {};
  const templates: ExtensionOptionTemplateType[] = useMemo(() => extensionOption?.templates || [], [
    extensionOption,
  ]);

  const extension = useMemo(() => extensions?.[extensionUUID], [
    extensionUUID,
    extensions,
  ]);

  // console.log(extensionOption)
  // console.log(extension)

  return (
    <>
      <Spacing mb={PADDING_UNITS}>
        <Text default>
          Add an extension block to start writing expectations for blocks in the current pipeline.
        </Text>
      </Spacing>

      <FlyoutMenuWrapper
        disableKeyboardShortcuts
        items={templates?.map(({
          description,
          name,
          path,
          uuid,
        }) => ({
          label: () => name,
          onClick: () => addNewBlockAtIndex({
            config: {
              template_path: path,
            },
            extension_uuid: extensionUUID,
            type: BlockTypeEnum.EXTENSION,
          }),
          tooltip: () => description,
          uuid,
        }))}
        onClickCallback={() => setDropdownMenuVisible(false)}
        open={dropdownMenuVisible}
        parentRef={refParent}
        uuid="Extension"
      >
        <KeyboardShortcutButton
          beforeElement={
            <Add />
          }
          inline
          onClick={(e) => {
            e.preventDefault();
            setDropdownMenuVisible(true);
          }}
          uuid="AddNewBlocks/Extension"
        >
          Add extension block
        </KeyboardShortcutButton>
      </FlyoutMenuWrapper>

      {/* Show blocks */}
    </>
  );
}

export default GreatExpectations;
