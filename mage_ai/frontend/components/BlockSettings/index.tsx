import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation } from 'react-query';

import BlockType, {
  BLOCK_TYPES_WITH_VARIABLES,
  BlockLanguageEnum,
  BlockPipelineType,
  BlockRequestPayloadType,
  BlockRetryConfigType,
  BlockTypeEnum,
} from '@interfaces/BlockType';
import Button from '@oracle/elements/Button';
import Checkbox from '@oracle/elements/Checkbox';
import Circle from '@oracle/elements/Circle';
import Flex from '@oracle/components/Flex';
import FlexContainer, { JUSTIFY_SPACE_BETWEEN_PROPS } from '@oracle/components/FlexContainer';
import GlobalDataProductType, {
  GlobalDataProductObjectTypeEnum,
} from '@interfaces/GlobalDataProductType';
import Headline from '@oracle/elements/Headline';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import Link from '@oracle/elements/Link';
import OutdatedAfterField from '@components/GlobalDataProductDetail/OutdatedAfterField';
import OutdatedStartingAtField from '@components/GlobalDataProductDetail/OutdatedStartingAtField';
import PipelineType, { PipelineRetryConfigType, PipelineTypeEnum } from '@interfaces/PipelineType';
import ProjectType from '@interfaces/ProjectType';
import RowDataTable, { RowStyle } from '@oracle/components/RowDataTable';
import Select from '@oracle/elements/Inputs/Select';
import SettingsField from '@components/GlobalDataProductDetail/SettingsField';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import TextInput from '@oracle/elements/Inputs/TextInput';
import Tooltip from '@oracle/components/Tooltip';
import VariableRow from '@components/Sidekick/GlobalVariables/VariableRow';
import api from '@api';
import usePrevious from '@utils/usePrevious';
import { Add, DiamondDetached, DiamondShared, Edit } from '@oracle/icons';
import { BannerStyle } from './index.style';
import { EXECUTOR_TYPES } from '@interfaces/ExecutorType';
import { ICON_SIZE_SMALL, ICON_SIZE_LARGE } from '@oracle/styles/units/icons';
import { OpenDataIntegrationModalType } from '@components/DataIntegrationModal/constants';
import {
  PADDING_UNITS,
  UNIT,
  UNITS_BETWEEN_ITEMS_IN_SECTIONS,
  UNITS_BETWEEN_SECTIONS,
} from '@oracle/styles/units/spacing';
import { TableContainerStyle } from '@components/IntegrationPipeline/index.style';
import { YELLOW } from '@oracle/styles/colors/main';
import { indexBy } from '@utils/array';
import { capitalize } from '@utils/string';
import { getBlockColorHexCodeMapping } from '@components/CodeBlock/utils';
import { getSelectedStreams } from '@utils/models/block';
import { ignoreKeys, isEmptyObject } from '@utils/hash';
import { isDataIntegrationBlock } from '@utils/models/block';
import { onSuccess } from '@api/utils/response';
import { useError } from '@context/Error';

const SHARED_BUTTON_PROPS = {
  borderLess: true,
  iconOnly: true,
  noBackground: true,
  outline: true,
  padding: '4px',
};
const SHARED_EMPHASIZED_TEXT_PROPS = {
  bold: true,
  default: true,
  inline: true,
  monospace: true,
  small: true,
};
const BLOCK_COLOR_HEX_CODE_MAPPING = getBlockColorHexCodeMapping();

type BlockSettingsProps = {
  addNewBlockAtIndex: (
    block: BlockRequestPayloadType,
    idx: number,
    onCreateCallback?: (block: BlockType) => void,
    name?: string,
    isReplacingBlock?: boolean,
  ) => Promise<any>;
  block: BlockType;
  fetchFileTree: () => void;
  fetchPipeline: () => void;
  globalDataProducts?: GlobalDataProductType[];
  contentByBlockUUID?: any;
  pipeline: PipelineType;
  project?: ProjectType;
  setSelectedBlock: (block: BlockType) => void;
  showUpdateBlockModal?: (
    block: BlockType,
    name: string,
    isReplacingBlock?: boolean,
  ) => void;
} & OpenDataIntegrationModalType;

function BlockSettings({
  addNewBlockAtIndex,
  block,
  contentByBlockUUID,
  fetchFileTree,
  fetchPipeline,
  globalDataProducts,
  pipeline,
  project,
  setSelectedBlock,
  showDataIntegrationModal,
  showUpdateBlockModal,
}: BlockSettingsProps) {
  const refExecutorTypeSelect = useRef(null);
  const refExecutorTypeTextInput = useRef(null);

  const pipelineUUID = useMemo(() => pipeline?.uuid, [pipeline]);
  const pipelineRetryConfig: PipelineRetryConfigType =
    useMemo(() => pipeline?.retry_config || {}, [pipeline]);

  const showBlockRunTimeout = useMemo(
    () => !pipeline?.run_pipeline_in_one_process &&
      [PipelineTypeEnum.PYSPARK, PipelineTypeEnum.PYTHON].includes(pipeline?.type),
    [pipeline]);

  const {
    color: blockColor,
    configuration,
    language,
    name: blockName,
    type: blockType,
    uuid: blockUUID,
  } = block;
  const isDbtBlock = useMemo(() => BlockTypeEnum.DBT === blockType, [blockType]);
  const currentBlockIndex = pipeline?.blocks?.findIndex(({ uuid }) => uuid === blockUUID);
  const blockWithUpdatedContent = useMemo(
    () => pipeline?.blocks?.[currentBlockIndex],
    [currentBlockIndex, pipeline?.blocks],
  );

  const [showError] = useError(null, {}, [], {
    uuid: 'BlockSettings/index',
  });

  const globalDataProductsByUUID =
    useMemo(() => indexBy(globalDataProducts || [], ({ uuid }) => uuid), [globalDataProducts]);
  const globalDataProduct = useMemo(() => {
    const gdpUUID = configuration?.global_data_product?.uuid;

    if (gdpUUID && globalDataProductsByUUID) {
      return globalDataProductsByUUID?.[gdpUUID];
    }
  }, [
    configuration,
    globalDataProductsByUUID,
  ]);

  const {
    data: dataPipeline,
  } = api.pipelines.detail(
    GlobalDataProductObjectTypeEnum.PIPELINE === globalDataProduct?.object_type
      && globalDataProduct?.object_uuid,
    {},
    {
      revalidateOnFocus: false,
    },
  );
  const globalDataProductPipeline = useMemo(() => dataPipeline?.pipeline, [dataPipeline]);

  const [blockAttributes, setBlockAttributesState] = useState<BlockType>(null);
  const [blockAttributesTouched, setBlockAttributesTouched] = useState<boolean>(false);
  const [editCustomExecutorType, setEditCustomExecutorType] = useState<boolean>(false);
  const [showNewBlockVariable, setShowNewBlockVariable] = useState<boolean>(false);

  const blockPrev = usePrevious(block);
  useEffect(() => {
    if (blockPrev?.uuid !== block?.uuid) {
      setBlockAttributesState(block);
    }
  }, [block, blockPrev]);

  const blockRetryConfig: BlockRetryConfigType =
    useMemo(() => blockAttributes?.retry_config || {}, [blockAttributes]);
  const setBlockAttributes = useCallback((handlePrevious) => {
    setBlockAttributesTouched(true);
    setBlockAttributesState(handlePrevious);
  }, []);

  const blockVariables: { [key: string]: string } = useMemo(() =>
    ignoreKeys(blockAttributes?.configuration || configuration, [
      'data_integration',
      'file_path',
      'file_source',
      'global_data_product',
    ]),
    [blockAttributes?.configuration, configuration],
  );
  const updateBlockVariable = useCallback(
    (variable:  { [key: string]: string }) => setBlockAttributes(prev => ({
      ...prev,
      configuration: {
        ...blockAttributes?.configuration,
        ...variable,
      },
    })),
    [blockAttributes?.configuration, setBlockAttributes],
  );

  const executorType = useMemo(() => blockAttributes?.executor_type, [blockAttributes]);
  useEffect(() => {
    if (!editCustomExecutorType
      && executorType
      && !EXECUTOR_TYPES.find(et => et === executorType)
    ) {
      setEditCustomExecutorType(true);
    }
  }, [
    editCustomExecutorType,
    executorType,
  ]);

  const {
    data: dataBlock,
    // mutate: fetchBlock,
  } = api.blocks.pipelines.detail(
    pipelineUUID,
    encodeURIComponent(blockUUID),
    {
      _format: 'with_settings',
      block_type: blockType,
    },
  );
  const blockDetails: {
    pipelines: BlockPipelineType[];
  } = useMemo(() => dataBlock?.block || {}, [dataBlock]);
  const blockPipelines: BlockPipelineType[] = useMemo(() => blockDetails?.pipelines
    ? blockDetails?.pipelines
    : []
  , [blockDetails]);
  const blockPipelinesCount = blockPipelines?.length || 1;

  const [updateBlock, { isLoading: isLoadingUpdateBlock }]: any = useMutation(
    api.blocks.pipelines.useUpdate(pipelineUUID, encodeURIComponent(blockUUID)),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: (resp) => {
            setBlockAttributesTouched(false);

            fetchFileTree?.();
            fetchPipeline();

            // Select the newly renamed block
            if (resp?.block) {
              setSelectedBlock(resp?.block);
            }
          },
          onErrorCallback: (response, errors) => showError({
            errors,
            response,
          }),
        },
      ),
    },
  );

  // @ts-ignore
  const onChangeBlock = useCallback((blockUpdated: BlockType) => updateBlock({
    block: blockUpdated,
  }), [updateBlock]);

  const pipelinesTable = useMemo(() => blockPipelinesCount >= 1 && (
    <TableContainerStyle>
      <Table
        columnFlex={[null, 1]}
        columns={[
          {
            uuid: 'Name',
          },
          {
            uuid: 'Project path',
          },
        ]}
        rows={blockPipelines.map(({
          pipeline: {
            name: pipelineName,
            repo_path: repoPath,
            uuid: pipelineUUID,
          },
        }) => {
          let nameEl;
          const isMultiProject = !!project?.settings;
          const isCurrentProject = pipeline?.uuid === pipelineUUID
            && (!isMultiProject || project?.settings?.path === repoPath);

          if (isCurrentProject || (isMultiProject && project?.settings?.path !== repoPath)) {
            nameEl = (
              <Text key="name" monospace muted>
                {pipelineName || pipelineUUID}
                {isCurrentProject && ' (current)'}
              </Text>
            );
          } else {
            nameEl = (
              <Link
                href={`/pipelines/${pipelineUUID}/edit`}
                key="name"
                monospace
                openNewWindow
                sameColorAsText
              >
                {pipelineName || pipelineUUID}
              </Link>
            );
          }

          return [
            nameEl,
            <Text default key="project_path" monospace>
              {repoPath || '-'}
            </Text>,
          ];
        })}
        uuid="git-branch-blockPipelines"
      />
    </TableContainerStyle>
  ), [
    blockPipelines,
    blockPipelinesCount,
    pipeline,
    project?.settings,
  ]);

  const isUsingPipelineRetryConfig: boolean = useMemo(() => pipelineRetryConfig
    && typeof pipelineRetryConfig !== 'undefined'
    && !isEmptyObject(pipelineRetryConfig)
    && (typeof pipelineRetryConfig?.delay !== 'undefined' && typeof blockRetryConfig?.delay === 'undefined'
      || typeof pipelineRetryConfig?.exponential_backoff !== 'undefined' && typeof blockRetryConfig?.exponential_backoff === 'undefined'
      || typeof pipelineRetryConfig?.max_delay !== 'undefined' && typeof blockRetryConfig?.max_delay === 'undefined'
      || typeof pipelineRetryConfig?.retries !== 'undefined' && typeof blockRetryConfig?.retries === 'undefined'
    )
  , [
    blockRetryConfig,
    pipelineRetryConfig,
  ]);

  const objectAttributes = useMemo(() => blockAttributes?.configuration?.global_data_product || {}, [
    blockAttributes,
  ]);
  const setObjectAttributes = useCallback(prev2 => setBlockAttributes(prev => ({
    ...prev,
    configuration: {
      ...blockAttributes?.configuration,
      global_data_product: prev2(blockAttributes?.configuration?.global_data_product),
    },
  })), [
    blockAttributes,
    setBlockAttributes,
  ]);

  const isDataIntegration = useMemo(() => isDataIntegrationBlock(block, pipeline), [
    block,
    pipeline,
  ]);
  const streams = useMemo(() => isDataIntegration && getSelectedStreams(block), [
    block,
    isDataIntegration,
  ]);

  return (
    <>
      <Spacing mb={UNITS_BETWEEN_SECTIONS} pt={PADDING_UNITS}>
        {blockPipelinesCount > 1 &&
          <Spacing mb={UNITS_BETWEEN_ITEMS_IN_SECTIONS} px={PADDING_UNITS}>
            <BannerStyle>
              <FlexContainer {...JUSTIFY_SPACE_BETWEEN_PROPS} >
                <Flex>
                  <DiamondShared fill={YELLOW} size={ICON_SIZE_LARGE} />
                  <Spacing pr={2} />
                  <Text
                    bold
                    large
                    lineHeight={UNIT * 3}
                    warning
                  >
                    Shared by {blockPipelinesCount} pipelines
                  </Text>
                </Flex>
                {(!isDbtBlock && pipeline?.type !== PipelineTypeEnum.INTEGRATION) && (
                  <Tooltip
                    appearBefore
                    block
                    label="Duplicates block so it is no longer shared with any other
                      pipelines (detaches other pipeline associations)"
                    lightBackground
                    maxWidth={UNIT * 30}
                    size={null}
                  >
                    <Button
                      {...SHARED_BUTTON_PROPS}
                      afterIcon={<DiamondDetached size={ICON_SIZE_SMALL} />}
                      iconOnly={false}
                      onClick={() => showUpdateBlockModal(
                        {
                          ...ignoreKeys(blockWithUpdatedContent, [
                            'all_upstream_blocks_executed',
                            'callback_blocks',
                            'conditional_blocks',
                            'downstream_blocks',
                            'executor_config',
                            'executor_type',
                            'name',
                            'outputs',
                            'retry_config',
                            'status',
                            'tags',
                            'timeout',
                          ]),
                          detach: true,
                        },
                        `${blockName}_copy`,
                        true,
                      )}
                      padding={null}
                    >
                      Detach
                    </Button>
                  </Tooltip>
                )}
              </FlexContainer>
            </BannerStyle>
          </Spacing>
        }

        <Spacing mb={UNITS_BETWEEN_SECTIONS} px={PADDING_UNITS}>
          <RowDataTable
            noBackground
            noBoxShadow
            sameColorBorders
          >
            <RowStyle noBorder>
              <FlexContainer {...JUSTIFY_SPACE_BETWEEN_PROPS}>
                <Flex>
                  <Text bold default>
                    Name
                  </Text>
                </Flex>

                <Spacing mr={1} />

                <Button
                  {...SHARED_BUTTON_PROPS}
                  afterIcon={isDbtBlock ? null : <Edit size={ICON_SIZE_SMALL} />}
                  disabled={isDbtBlock}
                  onClick={() => showUpdateBlockModal(block, blockName)}
                >
                  <Text bold>
                    {blockName || ''}
                  </Text>
                </Button>
              </FlexContainer>
            </RowStyle>
            {BlockTypeEnum.CUSTOM === block?.type
              ? (
                <RowStyle noBorder>
                  <FlexContainer {...JUSTIFY_SPACE_BETWEEN_PROPS}>
                    <Flex>
                      <Text bold default>
                        Color
                      </Text>
                    </Flex>

                    <Spacing mr={1} />

                    <Button
                      {...SHARED_BUTTON_PROPS}
                      afterIcon={(
                        <Circle
                          color={blockColor
                            ? BLOCK_COLOR_HEX_CODE_MAPPING[blockColor]
                            : null
                          }
                          size={ICON_SIZE_SMALL}
                          square
                        />
                      )}
                      onClick={() => showUpdateBlockModal(block, blockName)}
                      outline={false}
                    >
                      <Text bold>
                        {capitalize(blockColor || '')}
                      </Text>
                    </Button>
                  </FlexContainer>
                </RowStyle>
              ) : null
            }
          </RowDataTable>
        </Spacing>

        {/*
          TODO: we can’t allow this entry point for now because this requires passing in a property
          called setContent which is a set state function in each code block. That function is
          required so that when making code text changes in the data integration modal,
          the new code text is reflected in the data integration modal after closing and opening it.
        */}
        {/*{isDataIntegration && (
          <Spacing mb={UNITS_BETWEEN_SECTIONS} px={PADDING_UNITS}>
            <RowDataTable
              noBackground
              noBoxShadow
              sameColorBorders
            >
              <RowStyle noBorder>
                <FlexContainer {...JUSTIFY_SPACE_BETWEEN_PROPS}>
                  <Text bold default>
                    Configuration
                  </Text>

                  <Spacing mr={1} />

                  <Button
                    {...SHARED_BUTTON_PROPS}
                    onClick={() => showDataIntegrationModal({
                      block,
                      contentByBlockUUID,
                      defaultMainNavigationTab: MainNavigationTabEnum.CONFIGURATION,
                      onChangeBlock,
                    })}
                  >
                    <Edit size={ICON_SIZE_SMALL} />
                  </Button>
                </FlexContainer>
              </RowStyle>
              <RowStyle noBorder>
                <FlexContainer {...JUSTIFY_SPACE_BETWEEN_PROPS}>
                  <Flex flex={1}>
                    <Text bold default>
                      Streams
                    </Text>
                  </Flex>

                  <Spacing mr={1} />

                  <Button
                    {...SHARED_BUTTON_PROPS}
                    afterIcon={<Edit size={ICON_SIZE_SMALL} />}
                    onClick={() => showDataIntegrationModal({
                      block,
                      contentByBlockUUID,
                      defaultMainNavigationTab: MainNavigationTabEnum.STREAMS,
                      onChangeBlock,
                    })}
                  >
                    <Text bold>
                      {streams?.length || 0} selected
                    </Text>
                  </Button>
                </FlexContainer>
              </RowStyle>
            </RowDataTable>
          </Spacing>
        )}*/}

        <Spacing mb={UNITS_BETWEEN_SECTIONS} px={PADDING_UNITS}>
          <Headline level={5}>
            Executor type
          </Headline>

          <Text muted>
            For more information on this setting, please read the <Link
              href="https://docs.mage.ai/production/configuring-production-settings/compute-resource#2-set-executor-type-and-customize-the-compute-resource-of-the-mage-executor"
              openNewWindow
            >
              documentation
            </Link>.
          </Text>

          <Spacing mt={1}>
            {!editCustomExecutorType && (
              <Select
                label="Executor type"
                // @ts-ignore
                onChange={e => setBlockAttributes(prev => ({
                  ...prev,
                  executor_type: e.target.value,
                }))}
                primary
                ref={refExecutorTypeSelect}
                value={blockAttributes?.executor_type || ''}
              >
                {EXECUTOR_TYPES.map(executorTypeOption => (
                  <option key={executorTypeOption} value={executorTypeOption}>
                    {executorTypeOption}
                  </option>
                ))}
              </Select>
            )}
            {editCustomExecutorType && (
              <TextInput
                label="Executor type"
                monospace
                // @ts-ignore
                onChange={e => setBlockAttributes(prev => ({
                  ...prev,
                  executor_type: e.target.value,
                }))}
                primary
                ref={refExecutorTypeTextInput}
                setContentOnMount
                value={blockAttributes?.executor_type || ''}
              />
            )}

            <Spacing mt={1}>
              <Link
                muted
                onClick={() => {
                  if (editCustomExecutorType) {
                    // @ts-ignore
                    setBlockAttributes(prev => ({
                      ...prev,
                      executor_type: null,
                    }));
                    setTimeout(() => refExecutorTypeSelect?.current?.focus(), 1);
                  } else {
                    setTimeout(() => refExecutorTypeTextInput?.current?.focus(), 1);
                  }
                  setEditCustomExecutorType(!editCustomExecutorType);
                }}
                preventDefault
                small
              >
                {editCustomExecutorType
                  ? 'Select a preset executor type'
                  : 'Enter a custom executor type'
                }
              </Link>
            </Spacing>
          </Spacing>
        </Spacing>

        <Spacing mb={UNITS_BETWEEN_SECTIONS} px={PADDING_UNITS}>
          <Headline level={5}>
            Retry configuration
          </Headline>

          <Text muted>
            {isUsingPipelineRetryConfig && (
              <>
                This block is currently using the retry configuration from the pipeline.
                You can override the pipeline’s retry configuration for this block.
                <br />
              </>
            )}
            For more information on this setting, please read the <Link
              href="https://docs.mage.ai/orchestration/pipeline-runs/retrying-block-runs"
              openNewWindow
            >
              documentation
            </Link>.
          </Text>

          <Spacing mt={1}>
            <FlexContainer>
              <TextInput
                label="Retries"
                monospace
                onChange={e => setBlockAttributes(prev => ({
                  ...prev,
                  retry_config: {
                    ...prev?.retry_config,
                    retries: typeof e.target.value !== 'undefined'
                      && e.target.value !== null
                      && e.target.value?.length >= 1
                        ? Number(e.target.value)
                        : null,
                  },
                }))}
                primary
                required={typeof pipelineRetryConfig?.retries === 'undefined'}
                setContentOnMount
                type="number"
                value={typeof blockRetryConfig?.retries !== 'undefined'
                  ? blockRetryConfig?.retries
                  : pipelineRetryConfig?.retries || ''
                }
              />

              <Spacing mr={1} />

              <TextInput
                label="Delay"
                monospace
                onChange={e => setBlockAttributes(prev => ({
                  ...prev,
                  retry_config: {
                    ...prev?.retry_config,
                    delay: typeof e.target.value !== 'undefined'
                      && e.target.value !== null
                      && e.target.value?.length >= 1
                        ? Number(e.target.value)
                        : null,
                  },
                }))}
                primary
                required={typeof pipelineRetryConfig?.delay === 'undefined'}
                setContentOnMount
                type="number"
                value={typeof blockRetryConfig?.delay !== 'undefined'
                  ? blockRetryConfig?.delay
                  : pipelineRetryConfig?.delay || ''
                }
              />

              <Spacing mr={1} />

              <TextInput
                label="Max delay"
                monospace
                onChange={e => setBlockAttributes(prev => ({
                  ...prev,
                  retry_config: {
                    ...prev?.retry_config,
                    max_delay: typeof e.target.value !== 'undefined'
                      && e.target.value !== null
                      && e.target.value?.length >= 1
                        ? Number(e.target.value)
                        : null,
                  },
                }))}
                primary
                required={typeof pipelineRetryConfig?.max_delay === 'undefined'}
                setContentOnMount
                type="number"
                value={typeof blockRetryConfig?.max_delay !== 'undefined'
                  ? blockRetryConfig?.max_delay
                  : pipelineRetryConfig?.max_delay || ''
                }
              />
            </FlexContainer>

            <Spacing mt={PADDING_UNITS}>
              <Checkbox
                checked={typeof blockRetryConfig?.exponential_backoff === 'undefined' &&
                    typeof pipelineRetryConfig?.exponential_backoff !== 'undefined'
                  ? !!pipelineRetryConfig?.exponential_backoff
                  : !!blockRetryConfig?.exponential_backoff
                }
                label="Exponential backoff"
                onClick={() => setBlockAttributes(prev => ({
                  ...prev,
                  retry_config: {
                    ...prev?.retry_config,
                    exponential_backoff: typeof blockRetryConfig?.exponential_backoff === 'undefined' &&
                      typeof pipelineRetryConfig?.exponential_backoff !== 'undefined'
                    ? !pipelineRetryConfig?.exponential_backoff
                    : !prev?.retry_config?.exponential_backoff,
                  },
                }))}
              />
            </Spacing>
          </Spacing>
        </Spacing>

        {showBlockRunTimeout && (
          <Spacing mb={UNITS_BETWEEN_SECTIONS} px={PADDING_UNITS}>
            <Headline level={5}>
              Block run timeout
            </Headline>
            <Spacing mb={1} />
            <TextInput
              label="Time in seconds"
              monospace
              onChange={e => setBlockAttributes(prev => ({
                ...prev,
                timeout: e.target.value,
              }))}
              primary
              setContentOnMount
              type="number"
              value={blockAttributes?.timeout || ''}
            />
            <Spacing mb={1} />
            <Text muted small>
              The block timeout will only be applied when the block is run through a trigger.
              If a block times out, the block run will be set to a failed state.
            </Text>
          </Spacing>
        )}

        {isDbtBlock && (
          <Spacing mb={UNITS_BETWEEN_SECTIONS} px={PADDING_UNITS}>
            <Headline level={5}>
              dbt settings
            </Headline>

            <Spacing mt={1}>
              <Checkbox
                checked={!!blockAttributes?.configuration?.dbt?.disable_tests}
                label="Disable automatically running dbt tests"
                onClick={() => setBlockAttributes(prev => ({
                  ...prev,
                  configuration: {
                    ...prev?.configuration,
                    dbt: {
                      ...prev?.configuration?.dbt,
                      disable_tests: !prev?.configuration?.dbt?.disable_tests,
                    },
                  },
                }))}
              />
            </Spacing>
          </Spacing>
        )}

        {BLOCK_TYPES_WITH_VARIABLES.includes(blockType) && BlockLanguageEnum.PYTHON === language && (
          <Spacing mb={UNITS_BETWEEN_SECTIONS} px={PADDING_UNITS}>
            <FlexContainer alignItems="center">
              <Headline level={5}>
                Block variables
              </Headline>
              <Spacing ml={2} />
              <KeyboardShortcutButton
                Icon={Add}
                blackBorder
                halfPaddingBottom
                halfPaddingTop
                inline
                onClick={() => setShowNewBlockVariable(prevState => !prevState)}
                smallIcon
                uuid="Sidekick/BlockSettings/addNewBlockVariable"
              >
                New
              </KeyboardShortcutButton>
            </FlexContainer>

            <Spacing mb={PADDING_UNITS} mt={1}>
              <Text muted>
                Press
                <Text {...SHARED_EMPHASIZED_TEXT_PROPS}> Enter</Text> or
                <Text {...SHARED_EMPHASIZED_TEXT_PROPS}> Return</Text> on a row to add or update a variable.
                These variables are only accessible in this block&nbsp;
                <Text {...SHARED_EMPHASIZED_TEXT_PROPS} bold={false}>
                  &#40;{blockUUID}&#41;.
                </Text>
                <Text inline muted> Refer to the
                  <Link
                    href="https://docs.mage.ai/development/variables/block-variables"
                    openNewWindow
                  > documentation
                  </Link> for more details.
                </Text>
              </Text>
              <Text muted>
                <Text bold inline warning>Note: </Text>
                Click the
                <Text {...SHARED_EMPHASIZED_TEXT_PROPS}> Update block settings</Text> button
                below to save changes. If you do not, any new or updated block variables will not be persisted.
              </Text>
            </Spacing>

            <Spacing mb={PADDING_UNITS}>
              {showNewBlockVariable &&
                <VariableRow
                  editStateInit
                  focusKey
                  key="new_block_variable"
                  onEnterCallback={() => setShowNewBlockVariable(false)}
                  onEscapeCallback={() => setShowNewBlockVariable(false)}
                  updateVariable={updateBlockVariable}
                />
              }
              {Object.entries(blockVariables)?.map((tuple: [string, any]) => {
                const variableKey = tuple[0];

                return (
                  <VariableRow
                    copyText={`kwargs['configuration'].get('${variableKey}')`}
                    deleteVariable={() =>{
                      const blockConfigUpdated = {
                        ...blockAttributes?.configuration,
                      };
                      delete blockConfigUpdated[variableKey];
                      setBlockAttributes(prev => ({
                        ...prev,
                        configuration: {
                          ...blockConfigUpdated,
                        },
                      }));
                    }}
                    disableKeyEdit
                    key={variableKey}
                    updateVariable={updateBlockVariable}
                    variable={{
                      uuid: variableKey,
                      value: tuple[1],
                    }}
                  />
                );
              })}
            </Spacing>
          </Spacing>
        )}

        {BlockTypeEnum.GLOBAL_DATA_PRODUCT === blockType && (
          <Spacing mb={UNITS_BETWEEN_SECTIONS}>
            <Spacing px={PADDING_UNITS}>
              <Headline level={5}>
                Override global data product settings
              </Headline>
            </Spacing>

            <Spacing mt={UNITS_BETWEEN_ITEMS_IN_SECTIONS}>
              <OutdatedAfterField
                objectAttributes={objectAttributes}
                originalAttributes={globalDataProduct}
                // @ts-ignore
                setObjectAttributes={setObjectAttributes}
              />
            </Spacing>

            <Spacing mt={UNITS_BETWEEN_ITEMS_IN_SECTIONS}>
              <OutdatedStartingAtField
                objectAttributes={objectAttributes}
                originalAttributes={globalDataProduct}
                // @ts-ignore
                setObjectAttributes={setObjectAttributes}
              />
            </Spacing>

            <Spacing mt={UNITS_BETWEEN_ITEMS_IN_SECTIONS}>
              <SettingsField
                blocks={globalDataProductPipeline?.blocks}
                objectAttributes={objectAttributes}
                originalAttributes={globalDataProduct}
                // @ts-ignore
                setObjectAttributes={setObjectAttributes}
              />
            </Spacing>
          </Spacing>
        )}

        <Spacing px={PADDING_UNITS}>
          <Button
            disabled={!blockAttributesTouched}
            loading={isLoadingUpdateBlock}
            onClick={() => updateBlock({
              block: {
                configuration: blockAttributes?.configuration,
                executor_type: blockAttributes?.executor_type,
                retry_config: blockRetryConfig,
                timeout: blockAttributes?.timeout,
              },
            })}
            primary
          >
            Update block settings
          </Button>
        </Spacing>
      </Spacing>

      <Spacing mb={UNITS_BETWEEN_SECTIONS}>
        {!dataBlock && (
          <Spacing p={PADDING_UNITS}>
            <Spinner inverted />
          </Spacing>
        )}

        {dataBlock && (
          <>
            <Spacing p={PADDING_UNITS}>
              <Headline level={5}>
                Pipelines using this block ({blockPipelinesCount})
              </Headline>
              <Text default>
                A shared block is available to and reused by multiple pipelines. It
                enables you to write code once and have it easily accessible anywhere
                in the workspace. As a result, any code changes will affect all
                pipelines sharing the block.
              </Text>
            </Spacing>

            {pipelinesTable}
          </>
        )}
      </Spacing>
    </>
  );
}

export default BlockSettings;
