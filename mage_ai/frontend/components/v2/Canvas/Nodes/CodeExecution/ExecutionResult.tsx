import { useInView } from "framer-motion"
import { EventEnum } from '@mana/events/enums';
import useCustomEventHandler from '@mana/events/useCustomEventHandler';
import EventStreamType, {
  ResultType,
  ExecutionResultType,
  ExecutionStatusEnum,
} from '@interfaces/EventStreamType';
import Scrollbar from '@mana/elements/Scrollbar';
import ExecutionOutput from '../../../ExecutionOutput';
import Ansi from 'ansi-to-react';
import Grid from '@mana/components/Grid';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Text from '@mana/elements/Text';
import Link from '@mana/elements/Link';
import moment from 'moment';
import styles from '@styles/scss/components/Canvas/Nodes/ExecutionOutput.module.scss';
import { DATE_FORMAT_LONG_MS } from '@utils/date';
import { TooltipAlign, TooltipWrapper, TooltipDirection, TooltipJustify } from '@context/v2/Tooltip';
import { convertToMillisecondsTimestamp, dateFormatLongFromUnixTimestamp } from '@utils/date';
import { displayLocalOrUtcTime } from '@components/Triggers/utils';
import { formatDurationFromEpoch, isNumeric } from '@utils/string';
import { shouldDisplayLocalTimezone } from '@components/settings/workspace/utils';
import { ExecutionOutputType } from '@interfaces/CodeExecutionType';
import Loading from '@mana/components/Loading';
import { unique } from "@utils/array";

export type ExecutionResultProps = {
  containerRect?: DOMRect;
  executing?: boolean;
  executionOutput?: ExecutionOutputType;
  first?: boolean;
  last?: boolean;
  handleContextMenu?: (
    event: React.MouseEvent<HTMLDivElement>,
    executionOutput: ExecutionOutputType,
  ) => void;
  fetchOutput?: (
    messageRequestUUID: string,
    opts: {
      onError: () => void;
      onSuccess: (executionOutput: ExecutionOutputType) => void;
      query: {
        namespace: string;
        path: string;
      };
    },
  ) => void;
};

function ExecutionResult(
  {
    containerRect,
    executing,
    executionOutput: executionOutputProp,
    fetchOutput,
    first,
    last,
    handleContextMenu,
  }: ExecutionResultProps,
  ref: React.ForwardedRef<HTMLDivElement>,
) {
  const scrollbarInnerRef = useRef<HTMLDivElement>(null);
  const displayLocalTimezone = shouldDisplayLocalTimezone();

  const [counter, setCounter] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [executionOutput, setExecutionOutput] = useState<ExecutionOutputType>(executionOutputProp);

  useCustomEventHandler({}, {
    [EventEnum.EVENT_STREAM_MESSAGE]: ({ detail }: CustomEvent) => {
      const { executionOutput: xo, result } = detail;
      if (executionOutputProp?.uuid === xo.uuid) {
        setCounter(Number(new Date()));
        setExecutionOutput(xo);
      }
    },
  });

  const results = unique(executionOutput?.messages ?? [], r => r.result_id);
  const resultsErrors = results?.filter(result => ExecutionStatusEnum.ERROR === result.status);
  const success = results?.find(result => ExecutionStatusEnum.SUCCESS === result.status);
  const hasOutputNotLoaded = results?.some(r => ResultType.OUTPUT === r.type);
  const hasOutput = executionOutput?.output?.some(o => o?.data);
  const hasError = resultsErrors?.length > 0;

  const { id, namespace, path } = {
    id: success?.process?.message_request_uuid,
    ...success?.metadata,
  };

  const getOutput = useCallback(() => {
    setLoading(true);

    fetchOutput(id, {
      onError: () => {
        setLoading(false);
      },
      onSuccess: (eoutput) => {
        setLoading(false);
        setExecutionOutput(eoutput);
      },
      query: {
        namespace: encodeURIComponent(namespace),
        path: encodeURIComponent(path),
      },
    });
  }, [fetchOutput, id, namespace, path]);

  const timestamps = results?.reduce(
    (acc, result) => ({
      max: acc.max === null ? result.timestamp : Math.max(acc.max, result.timestamp),
      min: acc.min === null ? result.timestamp : Math.min(acc.min, result.timestamp),
    }),
    {
      max: null,
      min: null,
    },
  );

  const resultsDisplay = results?.filter(r => r?.output ?? r?.output_text);
  const resultsDisplayMemo = resultsDisplay?.map(({
    output_text: outputText,
    process: {
      message_request_uuid: groupUUID,
    },
    result_id: resultID,
    status: resultStatus,
    timestamp,
    type: resultType,
  }, idx) => (
    <pre key={resultID}
      data-index={idx}
      data-message-request-uuid={groupUUID}
      data-timestamp={displayLocalOrUtcTime(
      moment(timestamp).format(DATE_FORMAT_LONG_MS),
      displayLocalTimezone,
      DATE_FORMAT_LONG_MS,
    )}>
      {outputText}
    </pre>
  ));

  const runtime = (timestamps?.max ?? 0) - (timestamps?.min ?? 0);

  const errorMemo = resultsErrors && resultsErrors?.map(({ error, result_id: resultID }) => {
    const {
      code_context_formatted: stacktrace,
      message_formatted: message,
      type,
    } = error ?? {};

    return (
      <Grid key={resultID} rowGap={12} templateColumns="auto" templateRows="auto auto">
        <Grid key={resultID} rowGap={6} templateColumns="auto" templateRows="auto auto">
          <Text monospace secondary semibold small>
            {/* ValueError */}
            <Ansi>{String(type)}</Ansi>
          </Text>

          {/* too many values to unpack (expected 4) */}
          {[message].map(
            (val, idx) =>
              val && (
                <Text key={`${resultID}-${val}-${idx}`} monospace small>
                  <Ansi>{String(val)}</Ansi>
                </Text>
              ),
          )}
        </Grid>

        {stacktrace?.length >= 1 && (
          <pre
            style={{
              whiteSpace: 'break-spaces',
            }}
          >
            <Text inline monospace small>
              <Ansi>
                {stacktrace?.join('\n')}
              </Ansi>
            </Text>
          </pre>
        )}
      </Grid>
    );
  });

  return (
    <div
      key={counter}
      onContextMenu={
        handleContextMenu
          ? event => handleContextMenu(event, executionOutput)
          : undefined
      }
      ref={ref}
    >
      {(resultsDisplay?.length > 0 || hasError || (hasOutput || hasOutputNotLoaded)) && (
        <Grid
          paddingBottom={last ? 6 : 0}
          paddingTop={first ? 6 : 0}
          ref={ref}
          rowGap={4}
        >
          <Grid autoFlow="column" columnGap={8} justifyContent="space-between">
            <Text monospace muted xsmall>
              {isNumeric(timestamps.min)
                ? dateFormatLongFromUnixTimestamp(
                    convertToMillisecondsTimestamp(Number(timestamps.min)) / 1000,
                    {
                      withSeconds: true,
                    },
                  )
                : timestamps.min}
            </Text>
          </Grid>

          <Scrollbar
            autoHorizontalPadding
            className={[
              styles.executionOutputGroup,
            ].filter(Boolean).join(' ')}
            hideY
            hideYscrollbar
            innerRef={scrollbarInnerRef}
          >
            <Grid
              className={[
                styles.executionOutputGroupContainer,
              ].filter(Boolean).join(' ')}
            >
              {resultsDisplayMemo}

              {hasOutputNotLoaded && (
                <Grid alignItems="center"
                  alignContent="center"
                  columnGap={8}
                  data-message-request-uuid={executionOutput?.uuid}
                  templateColumns="1fr"
                  templateRows="auto"
                  style={{
                    height: 20,
                  }}
                >
                  {loading ? <Loading position="absolute" /> : (
                    <Link onClick={() => getOutput()} monospace small>
                      Load output results
                    </Link>
                  )}
                </Grid>
              )}

              {!hasOutput && errorMemo}
            </Grid>
          </Scrollbar>

          <ExecutionOutput containerRect={containerRect} executionOutput={executionOutput} />

          {hasOutput && hasError && (
            <Scrollbar
              autoHorizontalPadding
              className={[
                styles.executionOutputGroup,
                styles[status],
              ].filter(Boolean).join(' ')}
              hideY
              hideYscrollbar
            >
              <Grid
                className={[
                  styles.executionOutputGroupContainer,
                ].filter(Boolean).join(' ')}
              >
                {errorMemo}
              </Grid>
            </Scrollbar>
          )}

          <div>
            <Grid autoFlow="column" columnGap={8} justifyContent="space-between">
              <div />

              <Text monospace muted xsmall>
                {formatDurationFromEpoch(runtime)}
              </Text>
            </Grid>
          </div>
        </Grid>
      )}
    </div>
  );
}

export default React.forwardRef(ExecutionResult);
