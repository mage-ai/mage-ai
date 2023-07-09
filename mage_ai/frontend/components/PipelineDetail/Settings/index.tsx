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
import Text from '@oracle/elements/Text';
import TextInput from '@oracle/elements/Inputs/TextInput';
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
import { isJsonString } from '@utils/string';

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

  const [editCustomExecutorType, setEditCustomExecutorType] = useState<boolean>(false);
  const [executorType, setExecutorType] = useState(pipeline?.executor_type);
  const [newPipelineName, setNewPipelineName] = useState(pipeline?.name || '');

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

  return (
    <Spacing p={PADDING_UNITS}>
      <TextInput
        label="Pipeline name"
        onChange={e => setNewPipelineName(e.target.value)}
        primary
        required
        setContentOnMount
        value={newPipelineName}
      />

      <Spacing mt={UNITS_BETWEEN_ITEMS_IN_SECTIONS}>
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
              onChange={e => setExecutorType(e.target.value)}
              primary
              ref={refExecutorTypeSelect}
              value={executorType || ''}
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
              onChange={e => setExecutorType(e.target.value)}
              primary
              ref={refExecutorTypeTextInput}
              setContentOnMount
              value={executorType || ''}
            />
          )}

          <Spacing mt={1}>
            <Link
              muted
              onClick={() => {
                if (editCustomExecutorType) {
                  setExecutorType(null);
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
        <FlexContainer>
          <Button
            loading={isPipelineUpdating}
            // @ts-ignore
            onClick={() => updatePipeline({
              executor_type: executorType,
              name: newPipelineName,
            })}
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
