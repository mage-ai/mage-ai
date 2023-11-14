import { useCallback } from 'react';

import ComputeServiceType, {
  SetupStepStatusEnum,
  SetupStepType,
} from '@interfaces/ComputeServiceType';
import ErrorMessage from '../ErrorMessage';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import { AlertTriangle, Check } from '@oracle/icons';
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
    step: SetupStepType,
    idx: number,
    stepsCount: number,
    opts?: {
      level?: number;
      numberEl?: any;
    },
  ) =>  {
    const {
      name,
      description,
      error,
      required,
      status_calculated: status,
      steps,
      tab,
      uuid,
    } = step;
    const {
      level,
      numberEl: numberElParent,
    } = opts || {
      level: 0,
      numberEl: null,
    };
    const substepsCount = steps?.length || 0;
    const completed = SetupStepStatusEnum.COMPLETED === status;

    let stepNumber = level === 0
      ? String(idx + 1)
      : alphabet()[idx].toLowerCase();

    if (level === 0 && stepsCount >= 10 && stepNumber <= 9 && 0) {
      stepNumber = `0${stepNumber}`;
    }

    const clickable = !!tab && onClickStep;
    const numberEl = (
      <Spacing pl={level === 0 ? PADDING_UNITS : 0}>
        <Text large monospace muted>
          {stepNumber}.
        </Text>
      </Spacing>
    );

    const statusIconSize = level === 0 ? 2 * UNIT : 1.5 * UNIT;

    return (
      <SetupStepRowStyle
        clickable={clickable}
        key={uuid}
        onClick={clickable
          ? () => onClickStep?.(tab)
          : null
        }
      >
        <Spacing
          py={level === 0 ? PADDING_UNITS : 1}
        >
          <FlexContainer>
            {numberElParent && (
              <>
                <div style={{ opacity: 0 }}>
                  {numberElParent}
                </div>

                <Spacing mr={1} />
              </>
            )}

            {numberEl}

            <Spacing mr={1} />

            <Flex flex={1} flexDirection="column">
              <FlexContainer flexDirection="column">
                <FlexContainer
                  alignItems="center"

                >
                  <Flex flex={1}>
                    {level === 0 && (
                      <Headline level={4}>
                        {name}
                      </Headline>
                    )}
                    {level >= 1 && (
                      <Text bold large>
                        {name}
                      </Text>
                    )}

                    {!required && (
                      <>
                        <Spacing mr={1} />

                        <Text muted uppercase xsmall>
                          optional
                        </Text>
                      </>
                    )}
                  </Flex>

                  <Spacing mr={PADDING_UNITS} />

                  {SetupStepStatusEnum.COMPLETED === status && (
                    <Check
                      size={statusIconSize}
                      success
                    />
                  )}

                  {SetupStepStatusEnum.INCOMPLETE === status && (
                    <AlertTriangle
                      muted
                      size={statusIconSize}
                    />
                  )}

                  {SetupStepStatusEnum.ERROR === status && (
                    <AlertTriangle
                      danger
                      size={statusIconSize}
                    />
                  )}

                  <Spacing pr={PADDING_UNITS * (status ? 1 : 2)} />
                </FlexContainer>

                {description && (
                  <Spacing mt={1} pr={PADDING_UNITS * 3}>
                    <Text default>
                      {description}
                    </Text>
                  </Spacing>
                )}

                {error && (
                  <ErrorMessage error={error} small warning />
                )}
              </FlexContainer>
            </Flex>
          </FlexContainer>

          {substepsCount >= 1 && (
            <Spacing mt={1}>
              {steps?.map((substep, idx2) => buildStep(
                substep,
                idx2,
                substepsCount,
                {
                  level: 1,
                  numberEl,
                },
              ))}
            </Spacing>
          )}
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
