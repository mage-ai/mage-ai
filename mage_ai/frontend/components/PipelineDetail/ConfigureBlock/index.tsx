import { useEffect, useRef, useState } from 'react';

import BlockType, { BLOCK_TYPE_NAME_MAPPING } from '@interfaces/BlockType';
import Button from '@oracle/elements/Button';
import Checkbox from '@oracle/elements/Checkbox';
import FlexContainer from '@oracle/components/FlexContainer';
import Panel from '@oracle/components/Panel';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import TextInput from '@oracle/elements/Inputs/TextInput';
import { LOCAL_STORAGE_KEY_AUTOMATICALLY_NAME_BLOCKS } from '@storage/constants';
import { get, set } from '@storage/localStorage';

type ConfigureBlockProps = {
  block: BlockType;
  defaultName: string;
  onClose: () => void;
  onSave: (opts: {
    name: string;
  }) => void;
}

function ConfigureBlock({
  block,
  defaultName,
  onClose,
  onSave,
}: ConfigureBlockProps) {
  const refTextInput = useRef(null);
  const [blockName, setBlockName] = useState<string>('');
  const [automaticallyNameBlocks, setAutomaticallyNameBlocks] = useState<boolean>(
    !!get(LOCAL_STORAGE_KEY_AUTOMATICALLY_NAME_BLOCKS),
  );

  useEffect(() => {
    refTextInput?.current?.focus();
  }, []);

  return (
    <Panel>
      <Text bold>
        {BLOCK_TYPE_NAME_MAPPING[block?.type]} block name
      </Text>

      <Spacing mt={1}>
        <TextInput
          monospace
          onChange={e => setBlockName(e.target.value)}
          placeholder={defaultName}
          ref={refTextInput}
          value={blockName}
        />
      </Spacing>

      <Spacing mt={2}>
        <FlexContainer alignItems="center">
          <Checkbox
            checked={automaticallyNameBlocks}
            label={
              <Text muted small>
                Automatically use randomly generated name
                <br/>
                for blocks created in the future
              </Text>
            }
            onClick={() => {
              setAutomaticallyNameBlocks(!automaticallyNameBlocks);
              set(LOCAL_STORAGE_KEY_AUTOMATICALLY_NAME_BLOCKS, !automaticallyNameBlocks);
            }}
          />
        </FlexContainer>
      </Spacing>

      <Spacing mt={3}>
        <FlexContainer>
          <Button
            onClick={() => onSave({
              name: blockName || defaultName,
            })}
            primary
            tabIndex={0}
          >
            Save and add block
          </Button>

          <Spacing ml={1}>
            <Button
              onClick={onClose}
              tabIndex={0}
            >
              Cancel
            </Button>
          </Spacing>
        </FlexContainer>
      </Spacing>
    </Panel>
  );
}

export default ConfigureBlock;
