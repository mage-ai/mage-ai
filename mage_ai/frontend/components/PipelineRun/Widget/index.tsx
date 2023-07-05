import NextLink from 'next/link';

import Button from '@oracle/elements/Button';
import FlexContainer from '@oracle/components/FlexContainer';
import Link from '@oracle/elements/Link';
import PipelineRunType from '@interfaces/PipelineRunType';
import RowDataTable from '@oracle/components/RowDataTable';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import {
  ALL_PIPELINE_RUNS_TYPE,
  PipelineTypeEnum,
  PIPELINE_TYPE_ICON_MAPPING,
  PIPELINE_TYPE_LABEL_MAPPING,
} from '@interfaces/PipelineType';
import { RowStyle } from '@oracle/components/RowDataTable/index.style';
import { TAB_URL_PARAM } from '@oracle/components/Tabs';
import { TIME_PERIOD_DISPLAY_MAPPING } from '@components/Dashboard/constants';
import { TimePeriodEnum } from '@utils/date';
import { UNIT } from '@oracle/styles/units/spacing';
import { capitalize, lowercase } from '@utils/string';
import { queryFromUrl } from '@utils/url';

const MAX_HEIGHT = UNIT * 40;
const MIN_HEIGHT = UNIT * 40;

type WidgetProps = {
  pipelineType: PipelineTypeEnum | string;
  pipelineRuns: PipelineRunType[];
};

function Widget({
  pipelineType,
  pipelineRuns = [],
}: WidgetProps) {
  const q = queryFromUrl();
  const timePeriod = q?.[TAB_URL_PARAM] || TimePeriodEnum.TODAY;
  const isAllRuns = pipelineType === ALL_PIPELINE_RUNS_TYPE;
  const pipelineTypeLabel = isAllRuns
    ? ALL_PIPELINE_RUNS_TYPE
    : PIPELINE_TYPE_LABEL_MAPPING[pipelineType];
  const Icon = PIPELINE_TYPE_ICON_MAPPING[pipelineType];

  return (
    <RowDataTable
      footer={
        <FlexContainer alignItems="center" justifyContent="center">
          <NextLink
            as={'/pipeline-runs?status=failed'}
            href="/pipeline-runs"
            passHref
          >
            <Link
              sameColorAsText
            >
              View more
            </Link>
          </NextLink>
        </FlexContainer>
      }
      header={
        <FlexContainer alignItems="center">
          <Button
            beforeIcon={<Icon size={UNIT * 2.5} />}
            compact
            notClickable
          >
            {capitalize(pipelineTypeLabel)}
          </Button>
          <Spacing ml={2} />
          <Text bold>
            Latest {isAllRuns ? '' : `${lowercase(pipelineTypeLabel)} `}pipeline run failures
          </Text>
        </FlexContainer>
      }
      maxHeight={MAX_HEIGHT}
      minHeight={MIN_HEIGHT}
    >
      {pipelineRuns.length === 0
        ? (
          <FlexContainer
            alignItems="center"
            fullWidth
            justifyContent="center"
          >
            <Spacing p={17}>
              <Text large>
                No {isAllRuns ? '' : `${lowercase(pipelineTypeLabel)} `}pipeline run failures for {TIME_PERIOD_DISPLAY_MAPPING[timePeriod]}
              </Text>
            </Spacing>
          </FlexContainer>
        ) : pipelineRuns.map(({
          block_runs: blockRuns,
          created_at: createdAt,
          id: pipelineRunId,
          pipeline_uuid: pipelineUUID,
        }) => {
          return (
            <RowStyle key={`pipeline_run_${pipelineRunId}`}>
              <FlexContainer alignItems="center">
                <NextLink
                  as={`/pipelines/${pipelineUUID}`}
                  href="/pipelines/[pipeline]"
                  passHref
                >
                  <Link monospace sameColorAsText small>
                    Pipeline {pipelineUUID}
                  </Link>
                </NextLink>
                <Text monospace small>
                  &nbsp;&#62;&nbsp;
                </Text>
                <NextLink
                  as={`/pipelines/${pipelineUUID}/runs/${pipelineRunId}`}
                  href="/pipelines/[pipeline]/runs/[run]"
                  passHref
                >
                  <Link danger monospace sameColorAsText small>
                    Run created on {createdAt}
                  </Link>
                </NextLink>
              </FlexContainer>
            </RowStyle>
          );
        })}
    </RowDataTable>
  );
}

export default Widget;
