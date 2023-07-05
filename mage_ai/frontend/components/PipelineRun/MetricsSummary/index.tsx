import FlexContainer from '@oracle/components/FlexContainer';
import Flex from '@oracle/components/Flex';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import Tile from '@oracle/components/Tile';
import dark from '@oracle/styles/themes/dark';

import { GroupedPipelineRunCountType } from '@interfaces/MonitorStatsType';
import { MetricsSummaryContainerStyle } from './index.style';
import {
  PIPELINE_TYPE_ICON_MAPPING,
  PIPELINE_TYPE_LABEL_MAPPING,
} from '@interfaces/PipelineType';
import { RunStatus as RunStatusEnum } from '@interfaces/BlockRunType';
import { TimePeriodEnum } from '@utils/date';
import { TIME_PERIOD_DISPLAY_MAPPING } from '@components/Dashboard/constants';
import { capitalize } from '@utils/string';
import { formatNumber } from '@utils/number';
import { queryFromUrl } from '@utils/url';
import { sortTuplesArrayByFirstItem } from '@utils/array';

type MetricsSummaryProps = {
   pipelineRunCountByPipelineType: GroupedPipelineRunCountType;
};

function MetricsSummary({
  pipelineRunCountByPipelineType,
}: MetricsSummaryProps) {
  const q = queryFromUrl();
  const timePeriod: TimePeriodEnum = q?.tab || TimePeriodEnum.TODAY;
  const pipelineRunCounts = sortTuplesArrayByFirstItem(
    Object.entries(pipelineRunCountByPipelineType)
      .filter(([pipelineType, countsObj]) => Object.keys(countsObj).length !== 0),
  );

  return (
    <MetricsSummaryContainerStyle>
      <Text bold large>
        Pipeline run metrics for {TIME_PERIOD_DISPLAY_MAPPING[timePeriod]}
      </Text>

      <Spacing mb={2} />

      <FlexContainer alignItems="center" justifyContent="space-between">
        {pipelineRunCounts.map((
          [pipelineType, countsObj],
          idx,
        ) => (
          <Flex
            alignItems="center"
            flex="1"
            justifyContent="space-between"
            key={`${pipelineType}_metric`}
            style={idx !== 0
              ? { borderLeft: `1px solid ${dark.interactive.defaultBorder}` }
              : null
            }
          >
            <Spacing pl={idx !== 0 ? 3 : 0}>
              <Tile
                Icon={PIPELINE_TYPE_ICON_MAPPING[pipelineType]}
                label={PIPELINE_TYPE_LABEL_MAPPING[pipelineType]}
              />
            </Spacing>

            {sortTuplesArrayByFirstItem(Object.entries(countsObj))
              .map(([runStatus, count], idx) => (
                <Flex
                  flexDirection="column"
                  key={`${runStatus}_${idx}`}
                >
                  <Text>
                    {capitalize(runStatus)}
                  </Text>
                  <Text
                    bold
                    danger={runStatus === RunStatusEnum.FAILED && count > 0}
                    xlarge
                  >
                    {formatNumber(count)}
                  </Text>
                </Flex>
              )
            )}

            <Spacing pr={idx !== pipelineRunCounts.length - 1 ? 2 : 0} />
          </Flex>
        ))}
      </FlexContainer>
    </MetricsSummaryContainerStyle>
  );
}

export default MetricsSummary;
