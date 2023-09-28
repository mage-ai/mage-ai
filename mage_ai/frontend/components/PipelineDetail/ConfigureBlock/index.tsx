import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation } from 'react-query';

import BlockCubeGradient from '@oracle/icons/custom/BlockCubeGradient';
import BlockType, {
  BLOCK_TYPE_NAME_MAPPING,
  BlockColorEnum,
  BlockLanguageEnum,
  BlockRequestPayloadType,
  BlockTypeEnum,
  LANGUAGE_DISPLAY_MAPPING,
} from '@interfaces/BlockType';
import Button from '@oracle/elements/Button';
import CodeBlock from '@components/CodeBlock';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import LLMType, { LLMUseCaseEnum } from '@interfaces/LLMType';
import PipelineType, { PipelineTypeEnum } from '@interfaces/PipelineType';
import Select from '@oracle/elements/Inputs/Select';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import Text from '@oracle/elements/Text';
import TextInput from '@oracle/elements/Inputs/TextInput';
import api from '@api';
import {
  AISparkle,
  AlertTriangle,
  Locked,
} from '@oracle/icons';
import {
  ContainerStyle,
  FooterStyle,
  HeaderStyle,
  RowStyle,
} from './index.style';
import { DataIntegrationTypeEnum, TemplateTypeEnum } from '@interfaces/BlockTemplateType';
import { ICON_SIZE_LARGE } from '@oracle/styles/units/icons';
import { ObjectType } from '@interfaces/BlockActionObjectType';
import {
  PADDING_UNITS,
  UNIT,
} from '@oracle/styles/units/spacing';
import { capitalize } from '@utils/string';
import { onSuccess } from '@api/utils/response';
import { useError } from '@context/Error';

type ConfigureBlockProps = {
  block: BlockType | BlockRequestPayloadType;
  defaultName: string;
  isUpdatingBlock?: boolean;
  onClose: () => void;
  onSave: (opts: {
    color?: BlockColorEnum;
    language?: BlockLanguageEnum;
    name: string;
  }) => void;
  pipeline: PipelineType;
  preventDuplicateBlockName?: boolean;
};

function ConfigureBlock({
  block,
  defaultName,
  isUpdatingBlock,
  onClose,
  onSave,
  pipeline,
  preventDuplicateBlockName,
}: ConfigureBlockProps) {
  const [showError] = useError(null, {}, [], {
    uuid: 'ConfigureBlock',
  });

  // @ts-ignore
  const sharedPipelinesCount = Object.keys(block?.pipelines || {}).length;

  const refTextInput = useRef(null);
  const [blockAttributes, setBlockAttributes] = useState<{
    color?: BlockColorEnum;
    content?: string;
    language?: BlockLanguageEnum;
    name?: string;
    type?: BlockTypeEnum;
  }>({
    color: block?.color || null,
    language: block?.language,
    name: defaultName,
    type: block?.type,
  });

  useEffect(() => {
    refTextInput?.current?.focus();
  }, []);

  const isIntegrationPipeline = useMemo(() => PipelineTypeEnum.INTEGRATION === pipeline?.type, [
    pipeline,
  ]);

  const isCustomBlock = useMemo(() => BlockTypeEnum.CUSTOM === block?.type, [block]);
  const isMarkdown = useMemo(() => BlockTypeEnum.MARKDOWN === block?.type, [block]);

  // @ts-ignore
  const blockActionObject = useMemo(() => block?.block_action_object, [block]);
  const isGenerateBlock =
    useMemo(() => ObjectType.GENERATE_BLOCK === blockActionObject?.object_type, [blockActionObject]);
  const generateBlockCommand = useMemo(() => isGenerateBlock && blockActionObject?.description, [
    blockActionObject,
    isGenerateBlock,
  ]);

  const isDataIntegration: boolean = useMemo(() => {
    // @ts-ignore
    if (TemplateTypeEnum.DATA_INTEGRATION === block?.config?.template_type) {
      return true;
    }

    if (
      [
        DataIntegrationTypeEnum.DESTINATIONS,
        DataIntegrationTypeEnum.SOURCES,
      ].includes(blockActionObject?.language)
    ) {
      return true;
    }

    return false;
  }, [
      block,
      blockActionObject,
    ]);

  const [llm, setLLM] = useState<LLMType>(null);
  const [createLLM, { isLoading: isLoadingCreateLLM }] = useMutation(
    api.llms.useCreate(),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: ({
            llm,
          }) => {
            const {
              block_type: blockType,
              configuration,
              content,
              language,
            } = llm?.response || {};

            setBlockAttributes(prev => ({
              ...prev,
              block_action_object: null,
              configuration: configuration,
              content,
              language,
              type: blockType,
            }));

            setLLM(llm);
          },
          onErrorCallback: (response, errors) => showError({
            errors,
            response,
          }),
        },
      ),
    },
  );

  useEffect(() => {
    if (isGenerateBlock && generateBlockCommand && !llm) {
      // @ts-ignore
      createLLM({
        llm: {
          request: {
            block_description: generateBlockCommand,
          },
          use_case: LLMUseCaseEnum.GENERATE_BLOCK_WITH_DESCRIPTION,
        },
      });
    }
  }, [
    createLLM,
    generateBlockCommand,
    isGenerateBlock,
    llm,
  ]);

  const customTemplate = useMemo(() => {
    if (block?.config?.custom_template) {
      return block?.config?.custom_template;
    } else if ([
      ObjectType.CUSTOM_BLOCK_TEMPLATE,
      ObjectType.MAGE_TEMPLATE,
    ].includes(blockActionObject?.object_type)) {
      return {
        ...blockActionObject,
        name: blockActionObject?.title,
      };
    }
  }, [
    block,
    blockActionObject,
  ]);

  const title = useMemo(() => {
    let blockType = blockAttributes?.type || block?.type;

    if (customTemplate) {
      blockType = customTemplate?.block_type;
    }

    let tt = BLOCK_TYPE_NAME_MAPPING[blockType];
    if (isIntegrationPipeline) {
      if (BlockTypeEnum.DATA_LOADER === blockType) {
        tt = 'Source';
      } else if (BlockTypeEnum.DATA_EXPORTER === blockType) {
        tt = 'Destination';
      }
    }

    return tt;
  }, [
    block,
    blockAttributes,
    customTemplate,
    isIntegrationPipeline,
  ]);

  return (
    <ContainerStyle width={isGenerateBlock && blockAttributes?.content && (80 * UNIT)}>
      <HeaderStyle>
        {isGenerateBlock && isLoadingCreateLLM && (
          <FlexContainer alignItems="center" justifyContent="space-between">
            <Text>
              Generating block using AI...
            </Text>

            <Spinner inverted />
          </FlexContainer>
        )}

        {isGenerateBlock && !isLoadingCreateLLM && (
          <FlexContainer
            alignItems="center"
            justifyContent="center"
          >
            <AISparkle size={5 * UNIT} warning />
          </FlexContainer>
        )}

        {!isGenerateBlock && (
          <FlexContainer
            alignItems="center"
            justifyContent="center"
          >
            <BlockCubeGradient size={15 * UNIT} />
          </FlexContainer>
        )}
      </HeaderStyle>

      {isGenerateBlock && !isLoadingCreateLLM && (
        <RowStyle>
          <Spacing py={1}>
            <Spacing mb={1}>
              <Text default>
                Block generated using AI
              </Text>
            </Spacing>

            <Text textOverflow>
              {generateBlockCommand}
            </Text>
          </Spacing>
        </RowStyle>
      )}

      {customTemplate && (
        <RowStyle>
          <Spacing py={1}>
            <Spacing mb={1}>
              <Text default>
                Template
              </Text>
            </Spacing>

            <Text textOverflow>
              {(customTemplate?.name || customTemplate?.template_uuid)?.slice(0, 40)}
            </Text>
          </Spacing>
        </RowStyle>
      )}

      {BlockTypeEnum.GLOBAL_DATA_PRODUCT !== block?.type && sharedPipelinesCount > 1 && (
        <RowStyle>
          <Flex flex="1">
            <AlertTriangle size={ICON_SIZE_LARGE} warning />
          </Flex>

          <Flex flex="6">
            <Text bold warning>
              Renaming this block will affect {sharedPipelinesCount} pipelines.
              The renamed block may need to be re-added to the shared pipeline(s).
            </Text>
          </Flex>
        </RowStyle>
      )}

      <RowStyle>
        <Text default>
          Name
        </Text>

        <TextInput
          alignRight
          noBackground
          noBorder
          // @ts-ignore
          onChange={e => setBlockAttributes(prev => ({
            ...prev,
            name: e.target.value,
          }))}
          paddingVertical={UNIT}
          placeholder="Block name..."
          ref={refTextInput}
          value={blockAttributes?.name || ''}
        />
      </RowStyle>

      <RowStyle>
        <Text default>
          Type
        </Text>

        <Spacing mr={PADDING_UNITS} py={1}>
          <FlexContainer alignItems="center">
            <Text muted>
              {title}
            </Text>

            <Spacing mr={1} />

            <Locked muted />
          </FlexContainer>
        </Spacing>
      </RowStyle>

      {!isMarkdown && (isCustomBlock || customTemplate || blockAttributes?.language) && (
        <RowStyle paddingVerticalAddition={3}>
          <Text default>
            Language
          </Text>

          <FlexContainer alignItems="center">
            {[
              BlockLanguageEnum.PYTHON,
              BlockLanguageEnum.SQL,
              BlockLanguageEnum.R,
              BlockLanguageEnum.YAML,
            ].reduce((acc, v: string) => {
              const language =
                customTemplate ? customTemplate?.language : blockAttributes?.language;
              const selected = language === v;

              if (
                (
                  (!isCustomBlock || isUpdatingBlock)
                  && !selected
                  && (
                    (!isDataIntegration || BlockLanguageEnum.R === v)
                      || (!isDataIntegration || BlockLanguageEnum.SQL === v)
                  )
                ) || (
                  !isDataIntegration && BlockLanguageEnum.YAML === v
                )
              ) {
                return acc;
              }

              acc.push(
                <Spacing key={v} ml={1}>
                  <Button
                    borderColor={!selected ? 'transparent' : null}
                    compact
                    default={!isCustomBlock && !selected && !isDataIntegration}
                    disabled={!isCustomBlock && !selected && !isDataIntegration}
                    noBackground
                    notClickable={(!isCustomBlock || isUpdatingBlock || !isDataIntegration) && selected}
                    onClick={(customTemplate && !isDataIntegration)
                      ? null
                      // @ts-ignore
                      : () => setBlockAttributes(prev => ({
                        ...prev,
                        language: v,
                      }))
                    }
                    selected={selected}
                  >
                    {LANGUAGE_DISPLAY_MAPPING[v]}
                  </Button>
                </Spacing>,
              );

              return acc;
            }, [])}

            {!isCustomBlock && !isDataIntegration && (
              <>
                <Spacing mr={1} />
                <Locked muted />
              </>
            )}

            <Spacing mr={(isCustomBlock || isDataIntegration) ? 1 : 2} />
          </FlexContainer>
        </RowStyle>
      )}

      {(isCustomBlock || customTemplate?.color || blockAttributes?.color) && (
        <RowStyle>
          <Text default>
            Color
          </Text>

          {isCustomBlock && (
            <Select
              alignRight
              noBackground
              noBorder
              // @ts-ignore
              onChange={e => setBlockAttributes(prev => ({
                ...prev,
                color: e.target.value,
              }))}
              value={customTemplate
                ? customTemplate?.color || ''
                : blockAttributes?.color || ''
              }
            >
              <option value="" />
              {Object.values(BlockColorEnum).map((color: BlockColorEnum) => (
                <option key={color} value={color}>
                  {capitalize(color)}
                </option>
              ))}
            </Select>
          )}

          {!isCustomBlock && (
            <Spacing mr={PADDING_UNITS} py={1}>
              <FlexContainer alignItems="center">
                <Text muted>
                  {capitalize(customTemplate?.color || blockAttributes?.color || '')}
                </Text>

                <Spacing mr={1} />

                <Locked muted />
              </FlexContainer>
            </Spacing>
          )}
        </RowStyle>
      )}

      {isGenerateBlock && blockAttributes?.content && (
        <RowStyle display="block">
          <Spacing pr={PADDING_UNITS} py={1}>
            <DndProvider backend={HTML5Backend}>
              {/* @ts-ignore */}
              <CodeBlock
                block={{
                  ...blockAttributes,
                  uuid: generateBlockCommand,
                }}
                defaultValue={blockAttributes?.content}
                disableDrag
                hideExtraCommandButtons
                hideExtraConfiguration
                hideHeaderInteractiveInformation
                key={generateBlockCommand}
                noDivider
                onChange={val => setBlockAttributes(prev => ({
                  ...prev,
                  content: val,
                }))}
                selected
                textareaFocused
              />
            </DndProvider>
          </Spacing>
        </RowStyle>
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

      <FooterStyle>
        <FlexContainer fullWidth>
          <KeyboardShortcutButton
            bold
            centerText
            disabled={isLoadingCreateLLM}
            onClick={() => onSave({
              ...blockAttributes,
              name: blockAttributes?.name || defaultName,
            })}
            primary
            tabIndex={0}
            uuid="ConfigureBlock/SaveAndAddBlock"
          >
            Save and {isUpdatingBlock ? 'update' : 'add'} block
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
      </FooterStyle>
    </ContainerStyle>
  );
}

export default ConfigureBlock;
