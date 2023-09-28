import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import Button from '@oracle/elements/Button';
import Checkbox from '@oracle/elements/Checkbox';
import FlexContainer from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
import Link from '@oracle/elements/Link';
import PipelineType from '@interfaces/PipelineType';
import Select from '@oracle/elements/Inputs/Select';
import Spacing from '@oracle/elements/Spacing';
import TagType from '@interfaces/TagType';
import TagsAutocompleteInputField from '@components/Tags/TagsAutocompleteInputField';
import Text from '@oracle/elements/Text';
import TextInput from '@oracle/elements/Inputs/TextInput';
import api from '@api';
import usePrevious from '@utils/usePrevious';
import { EXECUTOR_TYPES } from '@interfaces/ExecutorType';
import {
  LOCAL_STORAGE_KEY_PIPELINE_EDIT_BLOCK_OUTPUT_LOGS,
  LOCAL_STORAGE_KEY_PIPELINE_EDIT_HIDDEN_BLOCKS,
} from '@storage/constants';
import {
  PADDING_UNITS,
  UNITS_BETWEEN_ITEMS_IN_SECTIONS,
  UNITS_BETWEEN_SECTIONS,
} from '@oracle/styles/units/spacing';
import { get, set } from '@storage/localStorage';
import { isEqual } from '@utils/hash';
import { isJsonString } from '@utils/string';
import { pushUnique } from '@utils/array';

type PipelineSettingsProps = {
  isPipelineUpdating?: boolean;
  pipeline: PipelineType;
  updatePipeline: (pipeline: PipelineType) => void;
};

function PipelineSettings({
  isPipelineUpdating,
  pipeline,
  updatePipeline,
}: PipelineSettingsProps) {
  const refExecutorTypeSelect = useRef(null);
  const refExecutorTypeTextInput = useRef(null);

  const pipelineUUID = pipeline?.uuid;
  const blocks = useMemo(() => pipeline?.blocks || [], [pipeline]);

  const [pipelineAttributesTouched, setPipelineAttributesTouched] = useState<boolean>(false);

  const [editCustomExecutorType, setEditCustomExecutorType] = useState<boolean>(false);
  const [pipelineAttributes, setPipelineAttributesState] = useState<PipelineType>(null);

  const pipelinePrev = usePrevious(pipeline);
  useEffect(() => {
    if (!isEqual(pipeline, pipelinePrev)) {
      setPipelineAttributesState(pipeline);
    }
  }, [
    pipeline,
    pipelinePrev,
  ]);

  const setPipelineAttributes = useCallback((handlePrevious) => {
    setPipelineAttributesTouched(true);
    setPipelineAttributesState(handlePrevious);
  }, []);

  const localStorageHiddenBlocksKey =
    `${LOCAL_STORAGE_KEY_PIPELINE_EDIT_HIDDEN_BLOCKS}_${pipelineUUID}`;
  const [hiddenBlocks, setHiddenBlocksState] = useState<{
    [uuid: string]: boolean;
  }>({});

  const localStorageBlockOutputLogsKey =
    `${LOCAL_STORAGE_KEY_PIPELINE_EDIT_BLOCK_OUTPUT_LOGS}_${pipelineUUID}`;
  const [blockOutputLogs, setBlockOutputLogsState] = useState<boolean>(false);

  const setHiddenBlocks = useCallback((callback) => {
    setHiddenBlocksState((prev) => {
      const data = callback(prev);
      set(localStorageHiddenBlocksKey, JSON.stringify(data));

      return data;
    });
  }, [
    localStorageHiddenBlocksKey,
    setHiddenBlocksState,
  ]);

  const setBlockOutputLogs = useCallback((callback) => {
    setBlockOutputLogsState((prev) => {
      const data = callback(prev);
      set(localStorageBlockOutputLogsKey, data);

      return data;
    });
  }, [
    localStorageBlockOutputLogsKey,
    setBlockOutputLogsState,
  ]);

  useEffect(() => {
    const hiddenBlocksInitString = get(localStorageHiddenBlocksKey);
    if (hiddenBlocksInitString && isJsonString(hiddenBlocksInitString)) {
      setHiddenBlocksState(JSON.parse(hiddenBlocksInitString));
    }
  }, [
    localStorageHiddenBlocksKey,
    setHiddenBlocksState,
  ]);

  useEffect(() => {
    const initValue = get(localStorageBlockOutputLogsKey);
    if (initValue) {
      setBlockOutputLogsState(initValue);
    }
  }, [
    localStorageBlockOutputLogsKey,
    setBlockOutputLogsState,
  ]);

  const executorType = useMemo(() => pipelineAttributes?.executor_type, [pipelineAttributes]);
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

  const allBlocksHidden = useMemo(() => {
    const arr = blocks?.filter(({ uuid }) => !!hiddenBlocks?.[uuid]);

    return arr.length === blocks.length;
  }, [
    blocks,
    hiddenBlocks,
  ]);

  const noBlocks = useMemo(() => !blocks?.length, [blocks]);

  const pipelineTags = useMemo(() => pipelineAttributes?.tags || [], [pipelineAttributes]);
  const { data: dataTags } = api.tags.list();
  const unselectedTags =
    useMemo(() => (dataTags?.tags || []).filter(({ uuid }) => !pipelineTags.includes(uuid)), [
      dataTags,
      pipelineTags,
    ]);

  return (
    <Spacing p={PADDING_UNITS}>
      <TextInput
        label="Pipeline name"
        onChange={e => setPipelineAttributes(prev => ({
          ...prev,
          name: e.target.value,
        }))}
        primary
        required
        setContentOnMount
        value={pipelineAttributes?.name || ''}
      />

      <Spacing mt={UNITS_BETWEEN_ITEMS_IN_SECTIONS}>
        <Checkbox
          checked={!!pipelineAttributes?.run_pipeline_in_one_process}
          label="Run pipeline in a single process"
          onClick={() => setPipelineAttributes(prev => ({
            ...prev,
            run_pipeline_in_one_process: !prev?.run_pipeline_in_one_process,
          }))}
        />

        <Spacing mt={1}>
          <Text muted small>
            When enabled, this setting allows sharing of objects and memory space across blocks
            within a single pipeline.
          </Text>
        </Spacing>
      </Spacing>

      <Spacing mt={UNITS_BETWEEN_SECTIONS}>
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
              onChange={e => setPipelineAttributes(prev => ({
                ...prev,
                executor_type: e.target.value,
              }))}
              primary
              ref={refExecutorTypeSelect}
              value={pipelineAttributes?.executor_type || ''}
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
              onChange={e => setPipelineAttributes(prev => ({
                ...prev,
                executor_type: e.target.value,
              }))}
              ref={refExecutorTypeTextInput}
              setContentOnMount
              value={pipelineAttributes?.executor_type || ''}
            />
          )}

          <Spacing mt={1}>
            <Link
              muted
              onClick={() => {
                if (editCustomExecutorType) {
                  setPipelineAttributes(prev => ({
                    ...prev,
                    executor_type: pipeline?.executor_type,
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

      <Spacing mt={UNITS_BETWEEN_SECTIONS}>
        <Headline>
          Retry configuration
        </Headline>

        <Text muted>
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
              onChange={e => setPipelineAttributes(prev => ({
                ...prev,
                retry_config: {
                  ...prev?.retry_config,
                  retries: typeof e.target.value !== 'undefined' && e.target.value !== null
                    ? Number(e.target.value)
                    : e.target.value,
                },
              }))}
              setContentOnMount
              type="number"
              value={pipelineAttributes?.retry_config?.retries || ''}
            />

            <Spacing mr={1} />

            <TextInput
              label="Delay"
              monospace
              onChange={e => setPipelineAttributes(prev => ({
                ...prev,
                retry_config: {
                  ...prev?.retry_config,
                  delay: typeof e.target.value !== 'undefined' && e.target.value !== null
                    ? Number(e.target.value)
                    : e.target.value,
                },
              }))}
              setContentOnMount
              type="number"
              value={pipelineAttributes?.retry_config?.delay || ''}
            />

            <Spacing mr={1} />

            <TextInput
              label="Max delay"
              monospace
              onChange={e => setPipelineAttributes(prev => ({
                ...prev,
                retry_config: {
                  ...prev?.retry_config,
                  max_delay: typeof e.target.value !== 'undefined' && e.target.value !== null
                    ? Number(e.target.value)
                    : e.target.value,
                },
              }))}
              setContentOnMount
              type="number"
              value={pipelineAttributes?.retry_config?.max_delay || ''}
            />

            <Spacing mr={1} />

            <Checkbox
              checked={!!pipelineAttributes?.retry_config?.exponential_backoff}
              label="Exponential backoff"
              onClick={() => setPipelineAttributes(prev => ({
                ...prev,
                retry_config: {
                  ...prev?.retry_config,
                  exponential_backoff: !prev?.retry_config?.exponential_backoff,
                },
              }))}
            />
          </FlexContainer>
        </Spacing>
      </Spacing>

      <Spacing mt={UNITS_BETWEEN_SECTIONS}>
        <Headline>
          Tags
        </Headline>

        <Spacing mt={1}>
          <TagsAutocompleteInputField
            removeTag={(tag: TagType) => {
              setPipelineAttributes(prev => ({
                ...prev,
                tags: pipelineTags.filter(uuid => uuid !== tag.uuid),
              }));
            }}
            selectTag={(tag: TagType) => {
              setPipelineAttributes(prev => ({
                ...prev,
                tags: pushUnique(tag.uuid, pipelineTags, uuid => uuid === tag.uuid),
              }));
            }}
            selectedTags={pipelineTags?.map(tag => ({ uuid: tag }))}
            tags={unselectedTags}
            uuid={`TagsAutocompleteInputField-${pipeline?.uuid}`}
          />
        </Spacing>
      </Spacing>

      <Spacing mt={UNITS_BETWEEN_SECTIONS}>
        <FlexContainer>
          <Button
            disabled={!pipelineAttributesTouched}
            loading={isPipelineUpdating}
            // @ts-ignore
            onClick={() => updatePipeline({
              executor_type: pipelineAttributes?.executor_type,
              name: pipelineAttributes?.name,
              retry_config: pipelineAttributes?.retry_config,
              run_pipeline_in_one_process: pipelineAttributes?.run_pipeline_in_one_process,
              tags: pipelineAttributes?.tags,
              // @ts-ignore
            }).then(() => setPipelineAttributesTouched(false))}
            primary
          >
            Save pipeline settings
          </Button>
        </FlexContainer>
      </Spacing>

      <Spacing mt={UNITS_BETWEEN_SECTIONS}>
        <Checkbox
          checked={allBlocksHidden && !noBlocks}
          disabled={noBlocks}
          label="Hide all blocks in notebook"
          onClick={() => setHiddenBlocks(() => {
            if (allBlocksHidden) {
              return {};
            }

            return blocks?.reduce((acc, { uuid }) => ({
              ...acc,
              [uuid]: true,
            }), {});
          })}
        />
      </Spacing>

      <Spacing mt={UNITS_BETWEEN_ITEMS_IN_SECTIONS}>
        <Checkbox
          checked={blockOutputLogs}
          label="When running a block while editing a pipeline, output the block messages to the logs"
          // @ts-ignore
          onClick={() => setBlockOutputLogs(prev => !prev)}
        />
      </Spacing>
    </Spacing>
  );
}

export default PipelineSettings;
