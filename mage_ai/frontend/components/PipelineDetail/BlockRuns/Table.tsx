import React, { useContext, useMemo, useState } from 'react';
import NextLink from 'next/link';
import Router from 'next/router';
import { ThemeContext } from 'styled-components';
import { useMutation } from 'react-query';

import AuthToken from '@api/utils/AuthToken';
import BlockRunType, { RunStatus } from '@interfaces/BlockRunType';
import Button from '@oracle/elements/Button';
import Circle from '@oracle/elements/Circle';
import ErrorsType from '@interfaces/ErrorsType';
import FlexContainer from '@oracle/components/FlexContainer';
import Link from '@oracle/elements/Link';
import PipelineType, { PipelineTypeEnum } from '@interfaces/PipelineType';
import Spacing from '@oracle/elements/Spacing';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import Tooltip from '@oracle/components/Tooltip';
import api from '@api';

import { FileExtensionEnum } from '@interfaces/FileType';
import { ResponseTypeEnum } from '@api/constants';
import { Save, Logs } from '@oracle/icons';
import { UNIT } from '@oracle/styles/units/spacing';
import { getColorsForBlockType } from '@components/CodeBlock/index.style';
import { indexBy } from '@utils/array';
import { onSuccess } from '@api/utils/response';
import { openSaveFileDialog } from '@components/PipelineDetail/utils';

type BlockRunsTableProps = {
  blockRuns: BlockRunType[];
  onClickRow?: (rowIndex: number) => void;
  pipeline: PipelineType;
  selectedRun?: BlockRunType;
  setErrors?: (errors: ErrorsType) => void;
};

function BlockRunsTable({
  blockRuns,
  onClickRow,
  pipeline,
  selectedRun,
  setErrors,
}: BlockRunsTableProps) {
  const themeContext = useContext(ThemeContext);
  const [blockOutputDownloadProgress, setBlockOutputDownloadProgress] = useState<string>(null);
  const [blockRunIdDownloading, setBlockRunIdDownloading] = useState<number>(null);
  const {
    uuid: pipelineUUID,
    type: pipelineType,
  } = pipeline || {};

  const blocks = useMemo(() => pipeline.blocks || [], [pipeline]);
  const blocksByUUID = useMemo(() => indexBy(blocks, ({ uuid }) => uuid), [blocks]);
  const isIntegration = useMemo(() => PipelineTypeEnum.INTEGRATION === pipelineType, [pipelineType]);
  const isStandardPipeline = useMemo(() => PipelineTypeEnum.PYTHON === pipelineType, [pipelineType]);

  const token = useMemo(() => new AuthToken()?.decodedToken?.token, []);
  const [
    downloadBlockOutputAsCsvFile,
    { isLoading: isLoadingDownloadBlockOutputAsCsvFile },
  ]: any = useMutation(
    ({ blockUUID, pipelineRunId }: any) => api.block_outputs.pipelines.downloads.detailAsync(
      pipeline?.uuid,
      blockUUID,
      { pipeline_run_id: pipelineRunId, token },
      {
        onDownloadProgress: (p) => setBlockOutputDownloadProgress((Number(p?.loaded || 0) / 1000000).toFixed(3)),
        responseType: ResponseTypeEnum.BLOB,
      },
    ),
    {
      onSuccess: (response: any) => onSuccess(
          response, {
            callback: (blobResponse) => {
              setBlockRunIdDownloading(null);
              openSaveFileDialog(
                blobResponse,
                `block_output.${FileExtensionEnum.CSV}`,
              );
            },
            onErrorCallback: (response, errors) => setErrors?.({
              errors,
              response,
            }),
          },
        ),
    },
  );

  const columnFlex = [1, 2, 2, 1, 1, null, null];
  const columns = [
    {
      uuid: 'Status',
    },
    {
      uuid: 'Block',
    },
    {
      uuid: 'Trigger',
    },
    {
      uuid: 'Created at',
    },
    {
      uuid: 'Completed at',
    },
    {
      uuid: 'Logs',
    },
  ];

  if (isStandardPipeline) {
    columns.push(
      {
        uuid: 'Output',
      },
    );
  }

  return (
    <Table
      columnFlex={columnFlex}
      columns={columns}
      isSelectedRow={(rowIndex: number) => blockRuns[rowIndex].id === selectedRun?.id}
      onClickRow={onClickRow}
      rows={blockRuns?.map((blockRun: BlockRunType) => {
        const {
          block_uuid: blockUUIDOrig,
          completed_at: completedAt,
          created_at: createdAt,
          id,
          pipeline_run_id: pipelineRunId,
          pipeline_schedule_id: pipelineScheduleId,
          pipeline_schedule_name: pipelineScheduleName,
          status,
        } = blockRun || {};
        let blockUUID = blockUUIDOrig;

        let streamID;
        let index;
        const parts = blockUUID.split(':');
        const downloadingOutput = blockRunIdDownloading === id
          && isLoadingDownloadBlockOutputAsCsvFile;

        if (isIntegration) {
          blockUUID = parts[0];
          streamID = parts[1];
          index = parts[2];
        }

        let block = blocksByUUID[blockUUID];
        if (!block) {
          block = blocksByUUID[parts[0]];
        }

        const rows = [
          <Text
            danger={RunStatus.FAILED === status}
            default={RunStatus.CANCELLED === status}
            info={RunStatus.INITIAL === status}
            key={`${id}_status`}
            monospace
            success={RunStatus.COMPLETED === status}
            warning={RunStatus.RUNNING === status}
          >
            {status}
          </Text>,
          <NextLink
            as={`/pipelines/${pipelineUUID}/edit?block_uuid=${blockUUID}`}
            href={'/pipelines/[pipeline]/edit'}
            key={`${id}_block_uuid`}
            passHref
          >
            <Link
              bold
              fitContentWidth
              verticalAlignContent
            >
              <Circle
                color={getColorsForBlockType(block?.type, {
                  blockColor: block?.color,
                  theme: themeContext,
                }).accent}
                size={UNIT * 1.5}
                square
              />
              <Spacing mr={1} />
              <Text monospace sky>
                {blockUUID}{streamID && ': '}{streamID && (
                  <Text default inline monospace>
                    {streamID}
                  </Text>
                )}{index >= 0 && ': '}{index >= 0 && (
                  <Text default inline monospace>
                    {index}
                  </Text>
                )}
              </Text>
            </Link>
          </NextLink>,
          <NextLink
            as={`/pipelines/${pipelineUUID}/triggers/${pipelineScheduleId}`}
            href={'/pipelines/[pipeline]/triggers/[...slug]'}
            key={`${id}_trigger`}
            passHref
          >
            <Link bold sky>
              {pipelineScheduleName}
            </Link>
          </NextLink>,
          <Text
            default
            key={`${id}_created_at`}
            monospace
            small
          >
            {createdAt}
          </Text>,
          <Text
            default
            key={`${id}_completed_at`}
            monospace
            small
          >
            {completedAt?.slice(0, 19) || '-'}
          </Text>,
          <Button
            default
            iconOnly
            key={`${id}_logs`}
            noBackground
            onClick={() => Router.push(
              `/pipelines/${pipelineUUID}/logs?block_run_id[]=${id}`,
            )}
          >
            <Logs default size={2 * UNIT} />
          </Button>,
        ];

        if (isStandardPipeline) {
          rows.push(
            <FlexContainer
              alignItems="center"
              justifyContent="center"
              key={`${id}_save_output`}
            >
              <Tooltip
                appearBefore
                autoHide={!downloadingOutput}
                block
                forceVisible={downloadingOutput}
                label={downloadingOutput
                  ? `${blockOutputDownloadProgress || 0}mb downloaded...`
                  : 'Save block run output as CSV file'
                }
                size={null}
                widthFitContent
              >
                <Button
                  default
                  disabled={!isStandardPipeline
                    || !(RunStatus.COMPLETED === status)
                    || isLoadingDownloadBlockOutputAsCsvFile}
                  iconOnly
                  loading={downloadingOutput}
                  noBackground
                  onClick={() => {
                    setBlockOutputDownloadProgress(null);
                    setBlockRunIdDownloading(id);
                    downloadBlockOutputAsCsvFile({ blockUUID, pipelineRunId });
                  }}
                >
                  <Save default size={2 * UNIT} />
                </Button>
              </Tooltip>
            </FlexContainer>,
          );
        }

        return rows;
      })}
      uuid="block-runs"
    />
  );
}

export default BlockRunsTable;
