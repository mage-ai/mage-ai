import { useCallback } from 'react';

import ComputeServiceType, {
  SetupStepStatusEnum,
  SetupStepType,
} from '@interfaces/ComputeServiceType';
import ErrorMessage from '../ErrorMessage';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import {
  AlertTriangle,
  Check,
  Info,
} from '@oracle/icons';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { SetupStepRowStyle } from '../index.style';
import { alphabet } from '@utils/string';

type SetupStepsProps = {
  computeService: ComputeServiceType;
  onClickStep?: (tab: string) => void;
};

function SetupSteps({
  computeService,
  onClickStep,
}: SetupStepsProps) {
  const buildStep = useCallback((
    {
      name,
      description,
      error,
      required,
      status,
      steps,
      tab,
    }: SetupStepType,
    idx: number,
    stepsCount: number,
    opts?: {
      level?: number;
    },
  ) =>  {
    const level = opts?.level || 0;
    const substepsCount = steps?.length || 0;
    const completed = SetupStepStatusEnum.COMPLETED === status;

    let stepNumber = level === 0
      ? String(idx + 1)
      : alphabet()[idx].toLowerCase();

    if (level === 0 && stepsCount >= 10 && stepNumber <= 9 && 0) {
      stepNumber = `0${stepNumber}`;
    }

    return (
      <SetupStepRowStyle
        clickable={!!tab && !completed && onClickStep}
        key={name}
        onClick={tab && !completed && onClickStep
          ? () => onClickStep?.(tab)
          : null
        }
      >
        <Spacing
          mt={level >= 1 ? 1 : 0}
          px={level === 0 ? PADDING_UNITS : 0}
          py={level === 0 ? 1 : 0}
        >
          <FlexContainer>
            <Text monospace muted>
              {stepNumber}.
            </Text>

            <Spacing mr={1} />

            <Flex flex={1} flexDirection="column">
              <FlexContainer>
                <Flex flex={1} flexDirection="column">
                  <FlexContainer
                    alignItems="center"
                  >
                    <Text default={completed || !status}>
                      {name}
                    </Text>

                    {!required && (
                      <>
                        <Spacing mr={1} />

                        <Text muted uppercase xsmall>
                          optional
                        </Text>
                      </>
                    )}
                  </FlexContainer>

                  {description && !completed && (
                    <Text muted small>
                      {description}
                    </Text>
                  )}

                  {error && (
                    <ErrorMessage error={error} small warning />
                  )}
                </Flex>

                <Spacing mr={1} />

                {SetupStepStatusEnum.COMPLETED === status && (
                  <Check
                    size={2 * UNIT}
                    success
                  />
                )}

                {SetupStepStatusEnum.INCOMPLETE === status && (
                  <Info
                    muted
                    size={2 * UNIT}
                  />
                )}

                {SetupStepStatusEnum.ERROR === status && (
                  <AlertTriangle
                    danger
                    size={2 * UNIT}
                  />
                )}
              </FlexContainer>

              {substepsCount >= 1 && steps?.map((substep, idx2) => buildStep(
                substep,
                idx2,
                substepsCount, {
                  level: 1,
                },
              ))}
            </Flex>
          </FlexContainer>
        </Spacing>
      </SetupStepRowStyle>
    );
  }, [
    onClickStep,
  ]);

  const stepsEls = [];
  const stepsCount = computeService?.setup_steps?.length || 0;

  computeService?.setup_steps?.forEach((step, idx: number) => {
    const {
      status,
    } = step;

    stepsEls.push(buildStep(step, idx, stepsCount));
  });

  return (
    <>
      {stepsEls}
    </>
  );
}

export default SetupSteps;
