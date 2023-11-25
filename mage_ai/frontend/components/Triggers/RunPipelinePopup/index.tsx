import { useMemo, useState } from 'react';

import Button from '@oracle/elements/Button';
import Divider from '@oracle/elements/Divider';
import FlexContainer from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
import OverwriteVariables from '../OverwriteVariables';
import Panel from '@oracle/components/Panel';
import PipelineScheduleType from '@interfaces/PipelineScheduleType';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import dark from '@oracle/styles/themes/dark';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { parseVariables } from '@components/Sidekick/utils';
import { randomNameGenerator } from '@utils/string';

type RunPipelinePopupProps = {
  initialPipelineSchedulePayload: PipelineScheduleType,
  onCancel: () => void;
  onSuccess: (
    payload: { pipeline_schedule: PipelineScheduleType },
  ) => void;
  variables?: { [keyof: string]: string };
};

const BUTTON_PADDING = `${UNIT}px ${UNIT * 3}px`;

function RunPipelinePopup({
  initialPipelineSchedulePayload,
  onCancel,
  onSuccess,
  variables,
}: RunPipelinePopupProps) {
  const [enableVariablesOverwrite, setEnableVariablesOverwrite] = useState<boolean>(true);
  const [runtimeVariables, setRuntimeVariables] = useState<{
    [keyof: string]: string,
  }>(variables || {});

  const finalPipelineSchedulePayload = useMemo(() => ({
    ...initialPipelineSchedulePayload,
    name: randomNameGenerator(),
    variables: enableVariablesOverwrite ? parseVariables(runtimeVariables) : null,
  }), [
    initialPipelineSchedulePayload,
    enableVariablesOverwrite,
    runtimeVariables,
  ]);

  return (
    <Panel
      noPadding
      footer={
        <FlexContainer
          alignItems="center"
          fullWidth
          justifyContent="flex-end"
        >
          <Button
            onClick={() => {
              onSuccess({
                pipeline_schedule: finalPipelineSchedulePayload,
              });
              onCancel();
            }}
            padding={BUTTON_PADDING}
            primaryAlternate
          >
            Run now
          </Button>
          <Spacing mr={1} />
          <Button
            borderColor={dark.background.page}
            onClick={onCancel}
            padding={BUTTON_PADDING}
            secondary
          >
            Cancel
          </Button>
        </FlexContainer>
      }
      header={
        <Headline level={5}>
          Run pipeline now
        </Headline>
      }
      maxHeight="90vh"
      minWidth={UNIT * 85}
      subtitle={
        <>
          <Spacing pt={PADDING_UNITS} px={PADDING_UNITS}>
            <Text default>
              Creates a new trigger and immediately runs the current pipeline once.
            </Text>
          </Spacing>
        </>
      }
    >
      <Divider light />

      <OverwriteVariables
        enableVariablesOverwrite={enableVariablesOverwrite}
        originalVariables={variables}
        runtimeVariables={runtimeVariables}
        setEnableVariablesOverwrite={setEnableVariablesOverwrite}
        setRuntimeVariables={setRuntimeVariables}
      />
    </Panel>
  );
}

export default RunPipelinePopup;
