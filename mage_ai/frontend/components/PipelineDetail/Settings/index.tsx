import { useState } from 'react';

import Button from '@oracle/elements/Button';
import FlexContainer from '@oracle/components/FlexContainer';
import PipelineType from '@interfaces/PipelineType';
import Spacing from '@oracle/elements/Spacing';
import TextInput from '@oracle/elements/Inputs/TextInput';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';

type PipelineSettingsProps = {
  isPipelineUpdating?: boolean;
  pipeline: PipelineType;
  updatePipelineMetadata: (name: string, type?: string) => void;
};

function PipelineSettings({
  isPipelineUpdating,
  pipeline,
  updatePipelineMetadata,
}: PipelineSettingsProps) {
  const [newPipelineName, setNewPipelineName] = useState(pipeline?.name || '');

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
            onClick={() => updatePipelineMetadata(newPipelineName)}
            primary
          >
            Save pipeline settings
          </Button>
        </FlexContainer>
      </Spacing>
    </Spacing>
  );
}

export default PipelineSettings;
