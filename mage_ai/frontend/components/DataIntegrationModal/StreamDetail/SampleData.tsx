import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation } from 'react-query';

import BlockType, { OutputType as DataType } from '@interfaces/BlockType';
import Button from '@oracle/elements/Button';
import DataTable from '@components/DataTable';
import Link from '@oracle/elements/Link';
import OutputType, { DataOutputType } from '@interfaces/OutputType';
import PipelineType from '@interfaces/PipelineType';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import api from '@api';
import { DataTypeEnum } from '@interfaces/KernelOutputType';
import {
  PADDING_UNITS,
  UNIT,
  UNITS_BETWEEN_ITEMS_IN_SECTIONS,
  UNITS_BETWEEN_SECTIONS,
} from '@oracle/styles/units/spacing';
import { StreamType } from '@interfaces/IntegrationSourceType';
import { SubTabEnum } from '../constants';
import { TABLE_COLUMN_HEADER_HEIGHT } from '@components/Sidekick/index.style';
import {
  getParentStreamID,
  getSelectedPropertiesByPropertyUUID,
  getStreamID,
} from '@utils/models/block';
import { isEmptyObject } from '@utils/hash';
import { onSuccess } from '@api/utils/response';

type SampleDataProps = {
  block: BlockType;
  height?: number;
  pipeline: PipelineType;
  setSelectedSubTab?: (subTab: SubTabEnum) => void;
  showError: (opts: any) => void;
  stream: StreamType;
};

function SampleData({
  block,
  height,
  pipeline,
  setSelectedSubTab,
  showError,
  stream,
}: SampleDataProps) {
  const refSubheader = useRef(null);

  const [outputState, setOutput] = useState<OutputType>(null);
  const [sampleCount, setSampleCount] = useState(100);
  const [subheaderHeight, setSubheaderHeight] = useState(0);

  useEffect(() => {
    if (refSubheader?.current?.getBoundingClientRect().height) {
      setSubheaderHeight(refSubheader?.current?.getBoundingClientRect().height);
    }
  }, [refSubheader]);

  const pipelineUUID = pipeline?.uuid;
  const blockUUID = block?.uuid;

  const {
    parentStreamID,
    streamID,
  } = useMemo(() => ({
    parentStreamID: getParentStreamID(stream),
    streamID: getStreamID(stream),
  }), [
    stream,
  ]);

  const isEmpty = useMemo(() => isEmptyObject(
    getSelectedPropertiesByPropertyUUID(stream || {}) || {},
    {
      idIsInObject: true,
    },
  ), [
    stream,
  ]);

  const { data: dataOutput } = api.outputs.pipelines.detail(
    !outputState && pipelineUUID,
    !outputState && blockUUID,
    {
      parent_stream: parentStreamID,
      sample_count: sampleCount,
      stream: streamID,
    },
    {
      revalidateOnFocus: false,
    },
  );
  const [
    createOutputs,
    {
      isLoading: isLoadingCreateOutputs,
    },
  ]: [any, { isLoading: boolean }] = useMutation(
    api.outputs.useCreate(),
    {
      onSuccess: (response: any) => onSuccess(
        response,
        {
          callback: (resp) => {
            const {
              output,
            } = resp;

            setOutput(output);
          },
          onErrorCallback: (response, errors) => showError({
            errors,
            response,
          }),
        },
      ),
    },
  );

  const fetchOutputs = useCallback(() => createOutputs({
    output: {
      block_uuid: blockUUID,
      persist: 1,
      pipeline_uuid: pipelineUUID,
      refresh: 1,
      sample_count: sampleCount,
      streams: [
        {
          parent_stream: parentStreamID,
          stream: streamID,
        },
      ],
    },
  }), [
    blockUUID,
    createOutputs,
    parentStreamID,
    pipelineUUID,
    sampleCount,
    streamID,
  ]);

  const output = useMemo(() => outputState || dataOutput?.output, [
    dataOutput,
    outputState,
  ]);

  const dataForStream: DataType = useMemo(() => {
    const {
      outputs = [],
    } = output || {};

    return outputs?.find(({ uuid }: DataOutputType) => uuid === streamID)?.data;
  }, [
    output,
    streamID,
  ]);

  const tableMemos = useMemo(() => {
    const {
      sample_data: sampleData,
      type: outputType,
    } = dataForStream || {};

    const {
      columns,
      rows,
    } = sampleData || {};

    if (!columns?.length || !rows?.length) {
      return;
    }

    return (
      <DataTable
        columnHeaderHeight={TABLE_COLUMN_HEADER_HEIGHT}
        columns={columns}
        height={height - subheaderHeight}
        noBorderBottom
        noBorderLeft
        noBorderRight
        rows={rows}
      />
    );
  }, [
    dataForStream,
    height,
    subheaderHeight,
  ]);

  return (
    <>
      <Spacing p={PADDING_UNITS} ref={refSubheader}>
        {isEmpty
          ? (
            <>
              <Text default>
                Please select at least 1 column in the stream in order to fetch sample data.
              </Text>

              <Spacing mt={1}>
                <Link
                  bold
                  onClick={() => setSelectedSubTab(SubTabEnum.SETTINGS)}
                  preventDefault
                >
                  Go to Schema properties to select a column
                </Link>
              </Spacing>
            </>
          )
          : (
            <Button
              compact
              loading={isLoadingCreateOutputs}
              onClick={() => fetchOutputs()}
              primary
            >
              {dataForStream ? 'Refresh sample data' : 'Fetch sample data'}
            </Button>
          )
        }
      </Spacing>

      {tableMemos}
    </>
  );
}

export default SampleData;
