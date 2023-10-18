import moment from 'moment';
import { useMemo } from 'react';

import Accordion from '@oracle/components/Accordion';
import AccordionPanel  from '@oracle/components/Accordion/AccordionPanel';
import Divider from '@oracle/elements/Divider';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
import Panel from '@oracle/components/Panel';
import Spacing from '@oracle/elements/Spacing';
import SparkGraph from './SparkGraph';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import api from '@api';
import {
  DATE_FORMAT_LONG,
  DATE_FORMAT_SPARK,
  dateFormatLongFromUnixTimestamp,
  datetimeInLocalTimezone,
} from '@utils/date';
import { MOCK_SQL } from './shared/mocks';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';
import { SHARED_TEXT_PROPS } from './constants';
import { SparkSQLStatusEnum, SparkSQLType, } from '@interfaces/SparkType';
import { formatNumberToDuration } from '@utils/string';
import { shouldDisplayLocalTimezone } from '@components/settings/workspace/utils';

type SparkJobSqlsProps = {
  containerHeight?: number;
  treeRef?: any;
}

function SparkJobSqls({
  containerHeight,
  treeRef,
}: SparkJobSqlsProps) {
  const displayLocalTimezone = shouldDisplayLocalTimezone();

  const { data: dataSqls } = api.spark_sqls.list();
  const sqls: SparkSQLType[] = useMemo(() => [].concat(dataSqls?.spark_sqls || []), [dataSqls]);

  const tableMemo = useMemo(() => (
    <Table
      columnFlex={[null, null, null, null, null, null, null]}
      columns={[
        {
          uuid: 'ID',
        },
        {
          uuid: 'Submitted',
        },
        {
          center: true,
          uuid: 'Duration',
        },
        {
          uuid: 'Status',
        },
        {
          center: true,
          uuid: 'Successful jobs',
        },
        {
          center: true,
          uuid: 'Running jobs',
        },
        {
          center: true,
          uuid: 'Failed jobs',
        },
      ]}
      renderExpandedRowWithObject={(rowIndex: number, object: any) => {
        const sql = sqls?.[rowIndex];

        return (
          <>
            <Spacing p={PADDING_UNITS}>
              <Panel noPadding>
                <Spacing p={PADDING_UNITS}>
                  <FlexContainer
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <Flex flex={1} flexDirection="column">
                      <Headline level={4}>
                        Description
                      </Headline>

                      <Spacing mt={1}>
                        <Text default monospace>
                          {sql?.description}
                        </Text>
                      </Spacing>
                    </Flex>
                  </FlexContainer>
                </Spacing>
              </Panel>
            </Spacing>

            <Divider light />

            <Spacing p={PADDING_UNITS}>
              <Accordion
                noBoxShadow
                visibleMappingForced={{
                  '0': true,
                }}
              >
                <AccordionPanel noPaddingContent title="Plan">
                  <Spacing p={PADDING_UNITS}>
                    <Text default monospace preWrap small>
                      {sql?.plan_description}
                    </Text>
                  </Spacing>
                </AccordionPanel>
              </Accordion>
            </Spacing>
          </>
        );
      }}
      rows={sqls?.map(({
        duration,
        failed_job_ids: failedJobIds,
        id,
        running_job_ids: runningJobIds,
        status,
        submission_time: submissionTime,
        success_job_ids: successJobIds,
      }) => {
        const arr = [
          <Text {...SHARED_TEXT_PROPS} key="id">
            {id}
          </Text>,
          <Text {...SHARED_TEXT_PROPS} key="submissionTime">
            {submissionTime
              ? datetimeInLocalTimezone(
                moment(submissionTime, DATE_FORMAT_SPARK).format(DATE_FORMAT_LONG),
                displayLocalTimezone,
              )
              : '-'
             }
          </Text>,
          <Text {...SHARED_TEXT_PROPS} center key="duration">
            {duration ? formatNumberToDuration(duration) : 0}
          </Text>,
          <Text
            {...SHARED_TEXT_PROPS}
            key="status"
            success={SparkSQLStatusEnum.COMPLETED === status}
          >
            {status}
          </Text>,
          <Text {...SHARED_TEXT_PROPS} center key="successJobIds">
            {successJobIds?.length}
          </Text>,
          <Text {...SHARED_TEXT_PROPS} center key="runningJobIds">
            {runningJobIds?.length}
          </Text>,
          <Text {...SHARED_TEXT_PROPS} center key="failedJobIds">
            {failedJobIds?.length}
          </Text>,
        ];

        return arr;
      })}
    />
  ), [
    sqls,
  ]);

  return (
    <>
      {sqls?.length >= 1 && (
        <SparkGraph
          height={containerHeight}
          model={sqls?.[0]}
          treeRef={treeRef}
        />
      )}
      {/*{tableMemo}*/}
    </>
  );
}

export default SparkJobSqls;
