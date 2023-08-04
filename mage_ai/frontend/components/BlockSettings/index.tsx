import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation } from 'react-query';

import BlockType, {
  BlockColorEnum,
  BlockPipelineType,
  BlockRetryConfigType,
  BlockTypeEnum,
} from '@interfaces/BlockType';
import Button from '@oracle/elements/Button';
import Checkbox from '@oracle/elements/Checkbox';
import FlexContainer from '@oracle/components/FlexContainer';
import GlobalDataProductType, {
  GlobalDataProductObjectTypeEnum,
} from '@interfaces/GlobalDataProductType';
import Headline from '@oracle/elements/Headline';
import Link from '@oracle/elements/Link';
import OutdatedAfterField from '@components/GlobalDataProductDetail/OutdatedAfterField';
import OutdatedStartingAtField from '@components/GlobalDataProductDetail/OutdatedStartingAtField';
import PipelineType, { PipelineRetryConfigType } from '@interfaces/PipelineType';
import Select from '@oracle/elements/Inputs/Select';
import SettingsField from '@components/GlobalDataProductDetail/SettingsField';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import TextInput from '@oracle/elements/Inputs/TextInput';
import api from '@api';
import usePrevious from '@utils/usePrevious';
import { EXECUTOR_TYPES } from '@interfaces/ExecutorType';
import {
  PADDING_UNITS,
  UNITS_BETWEEN_ITEMS_IN_SECTIONS,
  UNITS_BETWEEN_SECTIONS,
} from '@oracle/styles/units/spacing';
import { capitalize } from '@utils/string';
import { indexBy } from '@utils/array';
import { isEmptyObject } from '@utils/hash';
import { onSuccess } from '@api/utils/response';
import { useError } from '@context/Error';

type BlockSettingsProps = {
  block: BlockType;
  fetchFileTree: () => void;
  fetchPipeline: () => void;
  globalDataProducts?: GlobalDataProductType[];
  pipeline: PipelineType;
  setSelectedBlock: (block: BlockType) => void;
};

function BlockSettings({
  block,
  fetchFileTree,
  fetchPipeline,
  globalDataProducts,
  pipeline,
  setSelectedBlock,
}: BlockSettingsProps) {
  const refExecutorTypeSelect = useRef(null);
  const refExecutorTypeTextInput = useRef(null);

  const pipelineUUID = useMemo(() => pipeline?.uuid, [pipeline]);
  const pipelineRetryConfig: PipelineRetryConfigType =
    useMemo(() => pipeline?.retry_config || {}, [pipeline]);

  const {
    configuration,
    type: blockType,
    uuid: blockUUID,
  } = block;

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
  );
  const globalDataProductPipeline = useMemo(() => dataPipeline?.pipeline, [dataPipeline]);

  const [blockAttributes, setBlockAttributesState] = useState<BlockType>(null);
  const [blockAttributesTouched, setBlockAttributesTouched] = useState<boolean>(false);
  const [editCustomExecutorType, setEditCustomExecutorType] = useState<boolean>(false);

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
    pipelines: BlockPipelineType;
  } = useMemo(() => dataBlock?.block || {}, [dataBlock]);
  const blockPipelines: BlockPipelineType[] = useMemo(() => blockDetails?.pipelines
    ? Object.values(blockDetails?.pipelines)
    : []
  , [blockDetails]);

  const [updateBlock, { isLoading: isLoadingUpdateBlock }] = useMutation(
    api.blocks.pipelines.useUpdate(pipelineUUID, blockUUID),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: (resp) => {
            setBlockAttributesTouched(false);

            fetchFileTree();
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

  const pipelinesTable = useMemo(() => blockPipelines?.length >= 1 && (
    <Table
      columnFlex={[null, 1]}
      columns={[
        {
          uuid: 'Name',
        },
        {
          uuid: 'Description',
        },
      ]}
      rows={blockPipelines.map(({
        pipeline: {
          description,
          name: pipelineName,
          uuid: pipelineUUID,
        },
      }) => {
        let nameEl;

        if (pipeline?.uuid === pipelineUUID) {
          nameEl = (
            <Text key="name" monospace muted>
              {pipelineName || pipelineUUID}
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
          <Text default key="description" monospace>
            {description || '-'}
          </Text>,
        ];
      })}
      uuid="git-branch-blockPipelines"
    />
  ), [
    blockPipelines,
    pipeline,
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

  return (
    <>
      <Spacing mb={UNITS_BETWEEN_SECTIONS}>
        <Spacing py={PADDING_UNITS}>
          <Spacing mb={UNITS_BETWEEN_SECTIONS} px={PADDING_UNITS}>
            <TextInput
              label="Name"
              // @ts-ignore
              onChange={e => setBlockAttributes(prev => ({
                ...prev,
                name: e.target.value,
              }))}
              primary
              setContentOnMount
              value={blockAttributes?.name || ''}
            />

            {BlockTypeEnum.CUSTOM === block?.type && (
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
            )}
          </Spacing>

          <Spacing mb={UNITS_BETWEEN_SECTIONS} px={PADDING_UNITS}>
            <Headline>
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
            <Headline>
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

          {BlockTypeEnum.GLOBAL_DATA_PRODUCT === blockType && (
            <Spacing mb={UNITS_BETWEEN_SECTIONS}>
              <Spacing px={PADDING_UNITS}>
                <Headline>
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
              // @ts-ignore
              onClick={() => updateBlock({
                block: {
                  color: blockAttributes?.color,
                  configuration: blockAttributes?.configuration,
                  executor_type: blockAttributes?.executor_type,
                  name: blockAttributes?.name,
                  retry_config: blockRetryConfig,
                },
              })}
              primary
            >
              Update block settings
            </Button>
          </Spacing>
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
              <Headline>
                Pipelines
              </Headline>
              <Text default>
                Here are all the pipelines that are using this block.
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
