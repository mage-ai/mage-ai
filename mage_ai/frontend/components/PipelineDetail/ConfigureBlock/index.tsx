import { useEffect, useMemo, useRef, useState } from 'react';

import BlockType, {
  BLOCK_TYPE_NAME_MAPPING,
  BlockColorEnum,
  BlockLanguageEnum,
  BlockRequestPayloadType,
  BlockTypeEnum,
  LANGUAGE_DISPLAY_MAPPING,
} from '@interfaces/BlockType';
import Button from '@oracle/elements/Button';
import Checkbox from '@oracle/elements/Checkbox';
import FlexContainer from '@oracle/components/FlexContainer';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import Panel from '@oracle/components/Panel';
import PipelineType, { PipelineTypeEnum } from '@interfaces/PipelineType';
import Select from '@oracle/elements/Inputs/Select';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import TextInput from '@oracle/elements/Inputs/TextInput';
import { LOCAL_STORAGE_KEY_AUTOMATICALLY_NAME_BLOCKS } from '@storage/constants';
import {
  PADDING_UNITS,
  UNITS_BETWEEN_ITEMS_IN_SECTIONS,
} from '@oracle/styles/units/spacing';
import { capitalize } from '@utils/string';
import { get, set } from '@storage/localStorage';

type ConfigureBlockProps = {
  block: BlockType | BlockRequestPayloadType;
  defaultName: string;
  onClose: () => void;
  onSave: (opts: {
    color?: BlockColorEnum;
    language?: BlockLanguageEnum;
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
  const [blockAttributes, setBlockAttributes] = useState<{
    color?: BlockColorEnum;
    language?: BlockLanguageEnum;
    name?: string;
  }>({
    language: block?.language,
    name: defaultName,
  });
  const [automaticallyNameBlocks, setAutomaticallyNameBlocks] = useState<boolean>(
    !!get(LOCAL_STORAGE_KEY_AUTOMATICALLY_NAME_BLOCKS),
  );

  useEffect(() => {
    refTextInput?.current?.focus();
  }, []);

  const isIntegrationPipeline = useMemo(() => PipelineTypeEnum.INTEGRATION === pipeline?.type, [
    pipeline,
  ]);

  // @ts-ignore
  const blockActionObject = useMemo(() => block?.block_action_object, [block]);

  const title = useMemo(() => {
    if (blockActionObject) {
      let t = blockActionObject?.title;
      if (t?.length > 40) {
        t = `${t?.slice(0, 40)}...`;
      }

      return `Block name for ${t}`;
    }

    const blockType = block?.type;

    let tt = BLOCK_TYPE_NAME_MAPPING[blockType];
    if (isIntegrationPipeline) {
      if (BlockTypeEnum.DATA_LOADER === blockType) {
        tt = 'Source';
      } else if (BlockTypeEnum.DATA_EXPORTER === blockType) {
        tt = 'Destination';
      }
    }

    return `${tt} block name`;
  }, [
    block,
    blockActionObject,
    isIntegrationPipeline,
  ]);

  return (
    <Panel>
      <Text bold>
        {title}
      </Text>

      <Spacing mt={PADDING_UNITS}>
        <TextInput
          monospace
          // @ts-ignore
          onChange={e => setBlockAttributes(prev => ({
            ...prev,
            name: e.target.value,
          }))}
          primary
          ref={refTextInput}
          value={blockAttributes?.name || ''}
        />
      </Spacing>

      {BlockTypeEnum.CUSTOM === block?.type && (
        <>
          <Spacing mt={PADDING_UNITS}>
            <Select
              label="Language"
              // @ts-ignore
              onChange={e => setBlockAttributes(prev => ({
                ...prev,
                language: e.target.value,
              }))}
              primary
              value={blockAttributes?.language || ''}
            >
              {[
                BlockLanguageEnum.PYTHON,
                BlockLanguageEnum.SQL,
                BlockLanguageEnum.R,
              ].map((v: string) => (
                <option key={v} value={v}>
                  {LANGUAGE_DISPLAY_MAPPING[v]}
                </option>
              ))}
            </Select>
          </Spacing>

          <Spacing mt={PADDING_UNITS}>
            <Select
              label="Color"
              // @ts-ignore
              onChange={e => setBlockAttributes(prev => ({
                ...prev,
                color: e.target.value,
              }))}
              primary
              value={blockAttributes?.color || ''}
            >
              {Object.values(BlockColorEnum).map((color: BlockColorEnum) => (
                <option key={color} value={color}>
                  {capitalize(color)}
                </option>
              ))}
            </Select>
          </Spacing>
        </>
      )}

      {/*<Spacing mt={PADDING_UNITS}>
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
      </Spacing>*/}

      <Spacing mt={UNITS_BETWEEN_ITEMS_IN_SECTIONS}>
        <FlexContainer>
          <KeyboardShortcutButton
            bold
            inline
            onClick={() => onSave({
              ...blockAttributes,
              name: blockAttributes?.name || defaultName,
            })}
            primary
            tabIndex={0}
            uuid="ConfigureBlock/SaveAndAddBlock"
          >
            Save and add block
          </KeyboardShortcutButton>

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
