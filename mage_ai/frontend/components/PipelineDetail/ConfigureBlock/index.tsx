import { useEffect, useMemo, useRef, useState } from 'react';

import BlockType, { BlockTypeEnum, BLOCK_TYPE_NAME_MAPPING } from '@interfaces/BlockType';
import Button from '@oracle/elements/Button';
import Checkbox from '@oracle/elements/Checkbox';
import FlexContainer from '@oracle/components/FlexContainer';
import Panel from '@oracle/components/Panel';
import PipelineType, { PipelineTypeEnum } from '@interfaces/PipelineType';
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
  pipeline: PipelineType;
};

function ConfigureBlock({
  block,
  defaultName,
  onClose,
  onSave,
  pipeline,
}: ConfigureBlockProps) {
  const refTextInput = useRef(null);
  const [blockName, setBlockName] = useState<string>(defaultName);
  const [automaticallyNameBlocks, setAutomaticallyNameBlocks] = useState<boolean>(
    !!get(LOCAL_STORAGE_KEY_AUTOMATICALLY_NAME_BLOCKS),
  );

  useEffect(() => {
    refTextInput?.current?.focus();
  }, []);

  const isIntegrationPipeline = useMemo(() => PipelineTypeEnum.INTEGRATION === pipeline?.type, [
    pipeline,
  ]);

  const title = useMemo(() => {
    const blockType = block?.type;

    if (isIntegrationPipeline) {
      if (BlockTypeEnum.DATA_LOADER === blockType) {
        return 'Source';
      } else if (BlockTypeEnum.DATA_EXPORTER === blockType) {
        return 'Destination';
      }
    }

    return BLOCK_TYPE_NAME_MAPPING[blockType];
  }, [block, isIntegrationPipeline])

  return (
    <Panel>
      <Text bold>
        {title} block name
      </Text>

      <Spacing mt={1}>
        <TextInput
          monospace
          onChange={e => setBlockName(e.target.value)}
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
