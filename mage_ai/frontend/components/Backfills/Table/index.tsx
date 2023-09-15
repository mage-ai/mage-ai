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
import { TIMEZONE_TOOLTIP_PROPS } from '@components/shared/Table/constants';
import { UNIT } from '@oracle/styles/units/spacing';
import { datetimeInLocalTimezone } from '@utils/date';
import { getTimeInUTCString } from '@components/Triggers/utils';
import { isViewer } from '@utils/session';
import { shouldDisplayLocalTimezone } from '@components/settings/workspace/utils';

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
          <Text default key="status" monospace>{status || 'inactive'}</Text>,
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
                {displayLocalTimezone
                  ? datetimeInLocalTimezone(startDatetime, displayLocalTimezone)
                  : getTimeInUTCString(startDatetime)
                }
                &nbsp;-&nbsp;
                {displayLocalTimezone
                  ? datetimeInLocalTimezone(endDatetime, displayLocalTimezone)
                  : getTimeInUTCString(endDatetime)
                }
              </>
            )}
            {!(startDatetime && endDatetime) && <>&#8212;</>}
          </Text>,
          <Text
            default
            key="started_at"
            monospace
            small
            title={startedAt ? `UTC: ${startedAt.slice(0, 19)}` : null}
          >
            {startedAt
              ? (displayLocalTimezone
                ? datetimeInLocalTimezone(startedAt, displayLocalTimezone)
                : getTimeInUTCString(startedAt)
              ): (
                <>&#8212;</>
              )
            }
          </Text>,
          <Text
            default
            key="completed_at"
            monospace
            small
            title={completedAt ? `UTC: ${completedAt.slice(0, 19)}` : null}
          >
            {completedAt
              ? (displayLocalTimezone
                ? datetimeInLocalTimezone(completedAt, displayLocalTimezone)
                : getTimeInUTCString(completedAt)
              ): (
                <>&#8212;</>
              )
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
