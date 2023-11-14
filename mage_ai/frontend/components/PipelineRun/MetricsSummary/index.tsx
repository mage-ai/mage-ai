import React, { useMemo } from 'react';

import FlexContainer from '@oracle/components/FlexContainer';
import Flex from '@oracle/components/Flex';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import Tile from '@oracle/components/Tile';
import Tooltip from '@oracle/components/Tooltip';
import { GroupedPipelineRunCountType } from '@interfaces/MonitorStatsType';
import {
  MetricContainerStyle,
  MetricsSummaryContainerStyle,
} from './index.style';
import {
  PIPELINE_TYPE_ICON_MAPPING,
  PIPELINE_TYPE_LABEL_MAPPING,
  PipelineTypeEnum,
} from '@interfaces/PipelineType';
import { Row } from '@components/shared/Grid';
import { RunStatus as RunStatusEnum } from '@interfaces/BlockRunType';
import { SHARED_UTC_TOOLTIP_PROPS } from '@components/PipelineRun/shared/constants';
import { capitalize } from '@utils/string';
import { formatNumber } from '@utils/number';
import { formatNumberLabel } from '@components/charts/utils/label';
import { shouldDisplayLocalTimezone } from '@components/settings/workspace/utils';
import { sortTuplesArrayByFirstItem } from '@utils/array';

type MetricsSummaryProps = {
   pipelineRunCountByPipelineType: GroupedPipelineRunCountType;
};

function MetricsSummary({
  pipelineRunCountByPipelineType,
}: MetricsSummaryProps) {
  const displayLocalTimezone = shouldDisplayLocalTimezone();
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

  const utcTooltipEl = useMemo(() => (
    displayLocalTimezone
      ? (
        <Spacing ml="4px">
          <Tooltip
            {...SHARED_UTC_TOOLTIP_PROPS}
            label="Please note that these metrics are based on UTC time."
          />
        </Spacing>
      ) : null
  ), [displayLocalTimezone]);

  return (
    <MetricsSummaryContainerStyle>
      <FlexContainer alignItems="center">
        <Text bold large>
          Pipeline run metrics
        </Text>
        {utcTooltipEl}
      </FlexContainer>

      <Spacing mb={2} />

      <Row style={{ gap: '16px' }}>
        {pipelineRunCounts.map((
          [pipelineType, countsObj],
          idx: number,
        ) => (
          <MetricContainerStyle
            includeLeftBorder={idx !== 0}
            key={`${pipelineType}_metric`}
          >
            <Tile
              Icon={PIPELINE_TYPE_ICON_MAPPING[pipelineType]}
              label={PIPELINE_TYPE_LABEL_MAPPING[pipelineType]}
            />

            {sortTuplesArrayByFirstItem(Object.entries(countsObj))
              .map(([runStatus, count], idx: number) => (
                <Spacing key={`${runStatus}_${idx}`} px={1}>
                  <Flex
                    flexDirection="column"
                  >
                    <Text>
                      {capitalize(runStatus)}
                    </Text>
                    <Text
                      bold
                      danger={runStatus === RunStatusEnum.FAILED && count > 0}
                      title={formatNumber(count)}
                      xlarge
                    >
                      {formatNumberLabel(
                        count,
                        { maxFractionDigits: 1, minAmount: 1000 },
                      )}
                    </Text>
                  </Flex>
                </Spacing>
              ),
            )}

            <Spacing pr={idx !== pipelineRunCounts.length - 1 ? 2 : 0} />
          </MetricContainerStyle>
        ))}
      </Row>
    </MetricsSummaryContainerStyle>
  );
}

export default MetricsSummary;
