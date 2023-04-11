import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import Button from '@oracle/elements/Button';
import Checkbox from '@oracle/elements/Checkbox';
import FlexContainer from '@oracle/components/FlexContainer';
import PipelineType from '@interfaces/PipelineType';
import Spacing from '@oracle/elements/Spacing';
import TextInput from '@oracle/elements/Inputs/TextInput';
import { LOCAL_STORAGE_KEY_PIPELINE_EDIT_HIDDEN_BLOCKS } from '@storage/constants';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';
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
  const pipelineUUID = pipeline?.uuid;
  const blocks = useMemo(() => pipeline?.blocks || [], [pipeline]);

  const [newPipelineName, setNewPipelineName] = useState(pipeline?.name || '');

  const localStorageHiddenBlocksKey =
    `${LOCAL_STORAGE_KEY_PIPELINE_EDIT_HIDDEN_BLOCKS}_${pipelineUUID}`;
  const [hiddenBlocks, setHiddenBlocksState] = useState<{
    [uuid: string]: boolean;
  }>({});

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

  useEffect(() => {
    const hiddenBlocksInitString = get(localStorageHiddenBlocksKey);
    if (hiddenBlocksInitString && isJsonString(hiddenBlocksInitString)) {
      setHiddenBlocksState(JSON.parse(hiddenBlocksInitString));
    }
  }, [
    localStorageHiddenBlocksKey,
    setHiddenBlocksState,
  ]);

  const allBlocksHidden = useMemo(() => {
    const arr = blocks?.filter(({ uuid }) => !!hiddenBlocks?.[uuid]);

    return arr.length === blocks.length;
  }, [
    blocks,
    hiddenBlocks,
  ]);

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

      <Spacing mt={5}>
        <FlexContainer>
          <Button
            disabled={newPipelineName === pipeline?.name}
            loading={isPipelineUpdating}
            // @ts-ignore
            onClick={() => updatePipeline({
              name: newPipelineName,
            })}
            primary
          >
            Save pipeline settings
          </Button>
        </FlexContainer>
      </Spacing>

      <Spacing mt={5}>
        <Checkbox
          checked={allBlocksHidden}
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
    </Spacing>
  );
}

export default PipelineSettings;
