import { useMemo } from 'react';
import NextLink from 'next/link';
import Router from 'next/router';

import BlockRunType from '@interfaces/BlockRunType';
import Button from '@oracle/elements/Button';
import Link from '@oracle/elements/Link';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import { Logs } from '@oracle/icons';
import { UNIT } from '@oracle/styles/units/spacing';
import {
    TIMEZONE_TOOLTIP_PROPS,
    getRunStatusTextProps,
} from '@components/shared/Table/constants';
import { dateFormatLong, datetimeInLocalTimezone, utcStringToElapsedTime } from '@utils/date';
import { shouldDisplayLocalTimezone } from '@components/settings/workspace/utils';

type BlockRunsTableProps = {
    blockRuns: BlockRunType[];
    selectedPipelineUUID?: string;
};

function BlockRunsTable({
                            blockRuns,
                            selectedPipelineUUID,
                        }: BlockRunsTableProps) {
    const displayLocalTimezone = shouldDisplayLocalTimezone();
    const timezoneTooltipProps = useMemo(
        () => (displayLocalTimezone ? TIMEZONE_TOOLTIP_PROPS : {}),
        [displayLocalTimezone],
    );
    const columnFlex = [];
    return (
      <Table
          columnFlex={columnFlex}
          columns={[
              { uuid: 'Status' },
              { center: true, uuid: 'Logs' },
              { uuid: 'Pipeline' },
              { uuid: 'Block' },
              { uuid: 'Run ID' },
              { ...timezoneTooltipProps, uuid: 'Created at' },
              { ...timezoneTooltipProps, uuid: 'Started at' },
              { ...timezoneTooltipProps, uuid: 'Completed at' },
          ]}
          rows={blockRuns?.map((blockRun: BlockRunType) => {
              const {
                  block_uuid: blockUUID,
                  completed_at: completedAt,
                  created_at: createdAt,
                  id,
                  pipeline_run_id: pipelineRunId,
                  started_at: startedAt,
                  status,
              } = blockRun || {};

              return [
                <Text {...getRunStatusTextProps(status)} key={`${id}_status`}>
                  {status}
                </Text>,
                <Button
                      default
                      disabled={!selectedPipelineUUID}
                      iconOnly
                      key={`${id}_logs`}
                      noBackground
                      onClick={() => Router.push(`/pipelines/${selectedPipelineUUID}/logs?block_run_id[]=${id}`)}
                  >
                  <Logs default size={2 * UNIT}/>
                </Button>,
                  selectedPipelineUUID ? (
                    <NextLink
                          as={`/pipelines/${selectedPipelineUUID}/runs/${pipelineRunId}`}
                          href={'/pipelines/[pipeline]/runs/[run]'}
                          key={`${id}_pipeline_uuid`}
                          passHref
                      >
                      <Link bold monospace sky>
                        {selectedPipelineUUID}
                      </Link>
                    </NextLink>
                  ) : (
                    <Text key={`${id}_pipeline_uuid`} muted>
                      Filter by pipeline
                    </Text>
                  ),
                <Text key={`${id}_block_uuid`} monospace>
                  {blockUUID}
                </Text>,
                <Text default key={`${id}_block_run_id`} monospace small>
                  {id}
                </Text>,
                <Text
                      default
                      key={`${id}_created_at`}
                      monospace
                      small
                      title={createdAt ? utcStringToElapsedTime(createdAt) : null}
                  >
                  {displayLocalTimezone
                          ? datetimeInLocalTimezone(createdAt, displayLocalTimezone)
                          : dateFormatLong(createdAt, { includeSeconds: true })}
                </Text>,
                <Text
                      default
                      key={`${id}_started_at`}
                      monospace
                      small
                      title={startedAt ? utcStringToElapsedTime(startedAt) : null}
                  >
                  {startedAt ? (
                          displayLocalTimezone ? (
                              datetimeInLocalTimezone(startedAt, displayLocalTimezone)
                          ) : (
                              dateFormatLong(startedAt, { includeSeconds: true })
                          )
                      ) : (
                        <>&#8212;</>
                      )}
                </Text>,
                <Text
                      default
                      key={`${id}_completed_at`}
                      monospace
                      small
                      title={completedAt ? utcStringToElapsedTime(completedAt) : null}
                  >
                  {completedAt ? (
                          displayLocalTimezone ? (
                              datetimeInLocalTimezone(completedAt, displayLocalTimezone)
                          ) : (
                              dateFormatLong(completedAt, { includeSeconds: true })
                          )
                      ) : (
                        <>&#8212;</>
                      )}
                </Text>,
              ];
          })} 
          uuid="global-block-runs"        />
    );
}

export default BlockRunsTable;
