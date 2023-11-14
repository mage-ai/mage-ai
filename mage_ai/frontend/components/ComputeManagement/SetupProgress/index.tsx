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
  const steps: SetupStepType[] = computeService?.setup_steps || [];
  const stepsCompleted: SetupStepType[] =
    steps?.filter(({
      required,
      status_calculated: status,
    }) => !required || SetupStepStatusEnum.COMPLETED === status)?.length || 0;

  const stepsCount: number = steps?.length || 1;
  const progress: number = stepsCompleted / stepsCount;

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
