import moment from 'moment';
import { ThemeContext } from 'styled-components';
import { useCallback, useContext, useMemo } from 'react';

import Circle from '@oracle/elements/Circle';
import Divider from '@oracle/elements/Divider';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import Tooltip from '@oracle/components/Tooltip';
import { BarContainerStyle, BarsContainerStyle, BarStyle, FillerStyle, TextStyle } from './index.style';
import {
  DATE_FORMAT_LONG,
  DATE_FORMAT_SPARK,
  dateFromFromUnixTimestamp,
  datetimeInLocalTimezone,
} from '@utils/date';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { SparkStageAttemptType, SparkTaskType } from '@interfaces/SparkType';
import { shouldDisplayLocalTimezone } from '@components/settings/workspace/utils';
import { sortByKey } from '@utils/array';

type TasksWaterfallChartProps = {
  stageAttempt: SparkStageAttemptType;
};

function TasksWaterfallChart({
  stageAttempt,
}: TasksWaterfallChartProps) {
  const themeContext = useContext(ThemeContext);
  const displayLocalTimezone = shouldDisplayLocalTimezone();
  const {
    submission_time: submissionTime,
  } = stageAttempt;
  const tasks: SparkTaskType[] =
    useMemo(() => sortByKey(
      Object.values(stageAttempt?.tasks || {}),
      ({ launch_time: launchTime }) => launchTime,
      {
        ascending: true,
      },
    ), [stageAttempt]);

  const {
    maxEndTimestamp,
    minLaunchTimestamp,
  } = useMemo(() => {
    let maxEndTimestampInner;
    let minLaunchTimestampInner;

    tasks?.forEach(({
      duration,
      launch_time: launchTime,
    }) => {
      const timestamp = moment(launchTime, DATE_FORMAT_SPARK).valueOf();
      if (!minLaunchTimestampInner || timestamp < minLaunchTimestampInner) {
        minLaunchTimestampInner = timestamp;
      }
      const endTimestamp = timestamp + duration;
      if (!maxEndTimestampInner || endTimestamp > maxEndTimestampInner) {
        maxEndTimestampInner = endTimestamp;
      }
    });

    return {
      maxEndTimestamp: maxEndTimestampInner,
      minLaunchTimestamp: minLaunchTimestampInner,
    }
  }, [tasks]);

  const renderTooltip = useCallback((text: string) => (
    <Tooltip
      appearAbove
      block
      fullSize
      label={(
        <Text leftAligned>
          {text}
        </Text>
      )}
      lightBackground
      muted
      widthFitContent
    >
      <FillerStyle />
    </Tooltip>
  ), []);

  const barsMemo = useMemo(() => {
    const durationTotal = maxEndTimestamp - minLaunchTimestamp;

    const bars = [];

    tasks?.forEach(({
      duration,
      task_id: taskId,
      launch_time: launchTime,
      scheduler_delay: schedulerDelay,
      task_metrics: {
        executor_deserialize_time: executorDeserializeTime,
        shuffle_read_metrics: {
          fetch_wait_time: fetchWaitTime,
        },
        executor_run_time: executorRunTime,
        shuffle_write_metrics: {
          write_time: writeTime,
        },
        result_serialization_time: resultSerializationTime,
      },
      getting_result_time: gettingResultTime,
    }, idx: number) => {
      const launchTimestamp = moment(launchTime, DATE_FORMAT_SPARK).valueOf();
      const endTimestamp = launchTimestamp + duration;

      const arr = [
        <BarStyle
          empty
          key="launchTimestamp"
          widthPercentage={(launchTimestamp - minLaunchTimestamp) / durationTotal}
        >
          {renderTooltip('Waiting to start')}
        </BarStyle>,
        <BarStyle
          blue
          key="schedulerDelay"
          widthPercentage={schedulerDelay / durationTotal}
        >
          {renderTooltip('Scheduler delay')}
        </BarStyle>,
        <BarStyle
          key="executorDeserializeTime"
          red
          widthPercentage={executorDeserializeTime / durationTotal}
        >
          {renderTooltip('Task deserialization time')}
        </BarStyle>,
        <BarStyle
          key="fetchWaitTime"
          orange
          widthPercentage={fetchWaitTime / durationTotal}
        >
          {renderTooltip('Shuffle read time')}
        </BarStyle>,
        <BarStyle
          green
          key="executorRunTime"
          widthPercentage={executorRunTime / durationTotal}
        >
          {renderTooltip('Executor computing time')}
        </BarStyle>,
        <BarStyle
          key="writeTime"
          widthPercentage={writeTime / durationTotal}
          yellow
        >
          {renderTooltip('Shuffle write time')}
        </BarStyle>,
        <BarStyle
          key="resultSerializationTime"
          purple
          widthPercentage={resultSerializationTime / durationTotal}
        >
          {renderTooltip('Result serialization time')}
        </BarStyle>,
        <BarStyle
          key="gettingResultTime"
          teal
          widthPercentage={gettingResultTime / durationTotal}
        >
          {renderTooltip('Getting result time')}
        </BarStyle>,
        <BarStyle
          empty
          key="endTime"
          widthPercentage={(maxEndTimestamp - endTimestamp) / durationTotal}
        >
          {renderTooltip('Already finished')}
        </BarStyle>,
      ];

      bars.push(
        <Spacing key={`divider-${taskId}`} mt={1} />
      );

      bars.push(
        <BarContainerStyle key={taskId}>
          {arr}
        </BarContainerStyle>
      );
    });

    return (
      <BarsContainerStyle>
        <BarContainerStyle>
          <FlexContainer fullWidth justifyContent="space-between">
            <Flex flex={1}>
              <Text monospace muted>
                {datetimeInLocalTimezone(
                  dateFromFromUnixTimestamp(minLaunchTimestamp, {
                    withMilliseconds: true,
                  }).format(DATE_FORMAT_LONG),
                  displayLocalTimezone,
                )}
              </Text>
            </Flex>

            <Flex flex={1} justifyContent="flex-end">
              <Text monospace muted>
                {datetimeInLocalTimezone(
                  dateFromFromUnixTimestamp(maxEndTimestamp, {
                    withMilliseconds: true,
                  }).format(DATE_FORMAT_LONG),
                  displayLocalTimezone,
                )}
              </Text>
            </Flex>
          </FlexContainer>
        </BarContainerStyle>

        {bars}
      </BarsContainerStyle>
    );
  }, [
    maxEndTimestamp,
    minLaunchTimestamp,
    renderTooltip,
    tasks,
  ]);

  return (
    <>
      <Spacing mb={PADDING_UNITS}>
        <Text bold large>
          Task timeline
        </Text>
      </Spacing>

      <Spacing mb={PADDING_UNITS}>
        {[
          {
            color: themeContext?.accent?.blue,
            uuid: 'Scheduler delay',
          },
          {
            color: themeContext?.accent.negative,
            uuid: 'Task deserialization time',
          },
          {
            color: themeContext?.accent.dbt,
            uuid: 'Shuffle read time',
          },
          {
            color: themeContext?.accent.positive,
            uuid: 'Executor computing time',
          },
          {
            color: themeContext?.accent.yellow,
            uuid: 'Shuffle write time',
          },
          {
            color: themeContext?.accent.purple,
            uuid: 'Result serialization time',
          },
          {
            color: themeContext?.accent.teal,
            uuid: 'Getting result time',
          },
        ].map(({
          color,
          uuid,
        }, idx: number) => (
          <Spacing key={uuid} mt={idx >= 1 ? 1 : 0}>
            <FlexContainer alignItems="center">
              <Circle color={color} size={1 * UNIT} />

              <Spacing mr={1} />

              <Text default>
                {uuid}
              </Text>
            </FlexContainer>
          </Spacing>
        ))}
      </Spacing>

      <FlexContainer>
        <div>
          <TextStyle>
            <Text bold monospace muted noWrapping>
              ID
            </Text>
          </TextStyle>

          {tasks?.map(({
            task_id: taskId,
          }, idx: number) => (
            <Spacing key={taskId} mt={1}>
              <TextStyle>
                <Text default monospace noWrapping>
                  {taskId}
                </Text>
              </TextStyle>
            </Spacing>
          ))}
        </div>

        <Spacing mr={2} />

        {barsMemo}
      </FlexContainer>
    </>
  );
}

export default TasksWaterfallChart;
