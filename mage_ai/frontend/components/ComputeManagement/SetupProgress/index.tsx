import { useMemo } from 'react';

import ComputeServiceType, {
  SetupStepStatusEnum,
  SetupStepType,
} from '@interfaces/ComputeServiceType';
import Divider from '@oracle/elements/Divider';
import Link from '@oracle/elements/Link';
import ProgressBar from '@oracle/components/ProgressBar';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';
import { pluralize } from '@utils/string';

type SetupProgressProps = {
  computeService: ComputeServiceType;
  onClick?: () => void;
};

function SetupProgress({
  computeService,
  onClick,
}: SetupProgressProps) {
  const {
    steps,
    stepsCompleted,
  }: {
    steps: SetupStepType[];
    stepsCompleted: number;
  } = useMemo(() => {
    const stepsInner = [];
    let stepsCompletedInner = 0;

    computeService?.setup_steps?.forEach((step) => {
      const {
        group,
        required,
        status_calculated: status,
        steps: substeps,
      } = step;

      if (group) {
        substeps?.forEach((step2) => {
          stepsInner.push(step2);

          const {
            required: required2,
            status_calculated: status2,
          } = step2;

          if (!required2 || SetupStepStatusEnum.COMPLETED === status2) {
            stepsCompletedInner += 1;
          }
        });
      } else {
        stepsInner.push(step);

        if (!required || SetupStepStatusEnum.COMPLETED === status) {
          stepsCompletedInner += 1;
        }
      }
    });

    return {
      steps: stepsInner,
      stepsCompleted: stepsCompletedInner,
    };
  }, [
    computeService,
  ]);

  const stepsCount: number = useMemo(() => steps?.length || 1, [steps]);
  const progress: number = useMemo(() => stepsCompleted / stepsCount, [
    stepsCompleted,
    stepsCount,
  ]);

  return (
    <Link
      block
      noHoverUnderline
      noOutline
      onClick={onClick ? () => onClick?.() : null}
      preventDefault
    >
      <Divider light />

      <Spacing p={PADDING_UNITS}>
        <Spacing mb={1}>
          <Text
            monospace
            muted
          >
            <Text
              default
              inline
            >
              {stepsCompleted}
            </Text> / <Text
              default
              inline
            >
              {stepsCount}
            </Text> {pluralize('step', stepsCount, false, true)} completed
          </Text>
        </Spacing>

        <ProgressBar
          progress={progress * 100}
        />
      </Spacing>

      <Divider light />
    </Link>
  );
}

export default SetupProgress;
