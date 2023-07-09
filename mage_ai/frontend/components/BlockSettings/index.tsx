import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation } from 'react-query';

import BlockType, { BlockPipelineType } from '@interfaces/BlockType';
import Button from '@oracle/elements/Button';
import Headline from '@oracle/elements/Headline';
import Link from '@oracle/elements/Link';
import PipelineType from '@interfaces/PipelineType';
import Select from '@oracle/elements/Inputs/Select';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import TextInput from '@oracle/elements/Inputs/TextInput';
import api from '@api';
import { EXECUTOR_TYPES } from '@interfaces/ExecutorType';
import {
  PADDING_UNITS,
  UNITS_BETWEEN_ITEMS_IN_SECTIONS,
  UNITS_BETWEEN_SECTIONS,
} from '@oracle/styles/units/spacing';
import { onSuccess } from '@api/utils/response';
import { useError } from '@context/Error';

type BlockSettingsProps = {
  block: BlockType;
  pipeline: PipelineType;
};

function BlockSettings({
  block,
  pipeline,
}: BlockSettingsProps) {
  const refExecutorTypeSelect = useRef(null);
  const refExecutorTypeTextInput = useRef(null);

  const pipelineUUID = useMemo(() => pipeline?.uuid, [pipeline]);

  const [showError] = useError(null, {}, [], {
    uuid: 'BlockSettings/index',
  });

  const {
    type: blockType,
    uuid: blockUUID,
  } = block;

  const [blockAttributes, setBlockAttributesState] = useState<BlockType>(block);
  const [blockAttributesTouched, setBlockAttributesTouched] = useState<boolean>(false);
  const [editCustomExecutorType, setEditCustomExecutorType] = useState<boolean>(false);

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
          callback: () => {
            setBlockAttributesTouched(false);
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

  return (
    <>
      {!dataBlock && (
        <Spacing p={PADDING_UNITS}>
          <Spinner inverted />
        </Spacing>
      )}

      <Spacing mb={UNITS_BETWEEN_SECTIONS}>
        <Spacing p={PADDING_UNITS}>
          <Spacing mb={UNITS_BETWEEN_ITEMS_IN_SECTIONS}>
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

          <Button
            disabled={!blockAttributesTouched}
            loading={isLoadingUpdateBlock}
            // @ts-ignore
            onClick={() => updateBlock({
              block: blockAttributes,
            })}
            primary
          >
            Update block settings
          </Button>
        </Spacing>
      </Spacing>

      {dataBlock && (
        <Spacing mb={UNITS_BETWEEN_SECTIONS}>
          <Spacing p={PADDING_UNITS}>
            <Headline>
              Pipelines
            </Headline>
            <Text default>
              Here are all the pipelines that are using this block.
            </Text>
          </Spacing>

          {pipelinesTable}
        </Spacing>
      )}
    </>
  );
}

export default BlockSettings;
