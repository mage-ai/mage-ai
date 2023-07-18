import React, { useMemo } from 'react';
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
  PipelineTypeEnum,
} from '@interfaces/PipelineType';
import { RunStatus as RunStatusEnum } from '@interfaces/BlockRunType';
import { capitalize } from '@utils/string';
import { formatNumber } from '@utils/number';
import { sortTuplesArrayByFirstItem } from '@utils/array';

type MetricsSummaryProps = {
   pipelineRunCountByPipelineType: GroupedPipelineRunCountType;
};

function MetricsSummary({
  pipelineRunCountByPipelineType,
}: MetricsSummaryProps) {
  const pipelineRunCounts = useMemo(() => {
    if (!pipelineRunCountByPipelineType) {
      return [];
    }

    const updated = JSON.parse(JSON.stringify(pipelineRunCountByPipelineType));
    const standardCountObj = updated[PipelineTypeEnum.PYTHON] || {};
    Object.entries(updated[PipelineTypeEnum.PYSPARK] || {}).forEach(([runStatus, count]) => {
      if (standardCountObj[runStatus]) {
        standardCountObj[runStatus] += count;
      } else {
        standardCountObj[runStatus] = count;
      }
    });
    updated[PipelineTypeEnum.PYTHON] = standardCountObj;
    delete updated[PipelineTypeEnum.PYSPARK];
    
    return sortTuplesArrayByFirstItem(
      Object.entries(updated)
        .filter(([pipelineType, countsObj]) => Object.keys(countsObj).length !== 0),
    );
  }, [pipelineRunCountByPipelineType]);

  return (
    <MetricsSummaryContainerStyle>
      <Text bold large>
        Pipeline run metrics
      </Text>

      <Spacing mb={2} />

      <FlexContainer alignItems="center" justifyContent="space-between">
        {pipelineRunCounts.map((
          [pipelineType, countsObj],
          idx: number,
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
              .map(([runStatus, count], idx: number) => (
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
              ),
            )}

            <Spacing pr={idx !== pipelineRunCounts.length - 1 ? 2 : 0} />
          </Flex>
        ))}
      </FlexContainer>
    </MetricsSummaryContainerStyle>
  );
}

export default MetricsSummary;
