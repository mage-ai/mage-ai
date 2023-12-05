import NextLink from 'next/link';

import BackfillType, {
  BACKFILL_TYPE_DATETIME,
  BACKFILL_TYPE_CODE,
} from '@interfaces/BackfillType';
import Button from '@oracle/elements/Button';
import Link from '@oracle/elements/Link';
import Table, { ColumnType } from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import { Edit } from '@oracle/icons';
import { RunStatus } from '@interfaces/PipelineRunType';
import {
  TIMEZONE_TOOLTIP_PROPS,
  getRunStatusTextProps,
} from '@components/shared/Table/constants';
import { UNIT } from '@oracle/styles/units/spacing';
import { displayLocalOrUtcTime } from '@components/Triggers/utils';
import { isViewer } from '@utils/session';
import { shouldDisplayLocalTimezone } from '@components/settings/workspace/utils';
import { utcStringToElapsedTime } from '@utils/date';

type BackfillsTableProps = {
  pipeline: {
    uuid: string;
  };
  models: BackfillType[];
  onClickRow: (backfill: BackfillType) => void;
  selectedRow?: BackfillType;
};

function BackfillsTable({
  models,
  onClickRow,
  pipeline,
  selectedRow,
}: BackfillsTableProps) {
  const isViewerRole = isViewer();
  const displayLocalTimezone = shouldDisplayLocalTimezone();
  const pipelineUUID = pipeline?.uuid;
  const timezoneTooltipProps = displayLocalTimezone ? TIMEZONE_TOOLTIP_PROPS : {};
  const columnFlex = [null, 1, null, null, null, 1, 1, null];
  const columns: ColumnType[] = [
    {
      uuid: 'Status',
    },
    {
      uuid: 'Name',
    },
    {
      uuid: 'Type',
    },
    {
      uuid: 'Runs',
    },
    {
      ...timezoneTooltipProps,
      uuid: 'Backfill',
    },
    {
      ...timezoneTooltipProps,
      uuid: 'Started at',
    },
    {
      ...timezoneTooltipProps,
      uuid: 'Completed at',
    },
  ];
  if (!isViewerRole) {
    columns.push({
      label: () => '',
      uuid: 'edit',
    });
  }

  return (
    <Table
      columnFlex={columnFlex}
      columns={columns}
      isSelectedRow={(rowIndex: number) => models[rowIndex].id === selectedRow?.id}
      onClickRow={(rowIndex: number) => onClickRow(models[rowIndex])}
      rows={models.map(({
        block_uuid: blockUUID,
        completed_at: completedAt,
        end_datetime: endDatetime,
        id,
        name,
        start_datetime: startDatetime,
        started_at: startedAt,
        status,
        total_run_count: totalRunCount,
      }, idx) => {
        const arr = [
          <Text
            {...getRunStatusTextProps(status)}
            key="status"
          >
            {status || 'inactive'}
          </Text>,
          <NextLink
            as={`/pipelines/${pipelineUUID}/backfills/${id}`}
            href={'/pipelines/[pipeline]/backfills/[...slug]'}
            key="name"
            passHref
          >
            <Link bold sameColorAsText>
              {name}
            </Link>
          </NextLink>,
          <Text default key="type" monospace>
            {blockUUID ? BACKFILL_TYPE_CODE : BACKFILL_TYPE_DATETIME}
          </Text>,
          <Text default key="runs" monospace>{totalRunCount || 0}</Text>,
          <Text default key="backfill" monospace small>
            {(startDatetime && endDatetime) && (
              <>
                {displayLocalOrUtcTime(startDatetime, displayLocalTimezone)}
                &nbsp;-&nbsp;
                {displayLocalOrUtcTime(endDatetime, displayLocalTimezone)}
              </>
            )}
            {!(startDatetime && endDatetime) && <>&#8212;</>}
          </Text>,
          <Text
            default
            key="started_at"
            monospace
            small
            title={startedAt ? utcStringToElapsedTime(startedAt) : null}
          >
            {startedAt
              ? displayLocalOrUtcTime(startedAt, displayLocalTimezone)
              : <>&#8212;</>
            }
          </Text>,
          <Text
            default
            key="completed_at"
            monospace
            small
            title={completedAt ? utcStringToElapsedTime(completedAt) : null}
          >
            {completedAt
              ? displayLocalOrUtcTime(completedAt, displayLocalTimezone)
              : <>&#8212;</>
            }
          </Text>,
        ];
        if (!isViewerRole) {
          arr.push(
            <Button
              default
              disabled={status === RunStatus.COMPLETED}
              iconOnly
              key={`${idx}_edit_button`}
              linkProps={{
                as: `/pipelines/${pipelineUUID}/backfills/${id}/edit`,
                href: '/pipelines/[pipeline]/backfills/[...slug]',
              }}
              noBackground
              title="Edit"
            >
              <Edit default size={2 * UNIT} />
            </Button>,
          );
        }

        return arr;
      })}
      uuid="pipeline-runs"
    />
  );
}

export default BackfillsTable;
