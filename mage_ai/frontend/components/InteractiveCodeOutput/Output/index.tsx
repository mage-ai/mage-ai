import tzMoment from 'moment-timezone';
import { useEffect, useMemo, useRef } from 'react';

import ButtonTabs, { TabType } from '@oracle/components/Tabs/ButtonTabs';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Loading from '@oracle/components/Loading';
import KernelOutputType, {
  DATA_TYPE_TEXTLIKE,
  DataTypeEnum,
  EXECUTION_STATUS_DISPLAY_LABEL_MAPPING,
  ExecutionStateEnum,
  ExecutionStatusEnum,
  MsgType,
} from '@interfaces/KernelOutputType';
import OutputDataCombined from './OutputDataCombined';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import useOutputGroups from './useOutputGroups';
import { DATE_FORMAT_LONG_NO_SEC_WITH_OFFSET, TIME_FORMAT, momentInLocalTimezone } from '@utils/date';
import { LoadingStyle } from './index.style';
import { isEmptyObject } from '@utils/hash';
import { parseRawDataFromMessage } from '@utils/models/kernel/utils';
import { prettyUnitOfTime } from '@utils/string';
import { shouldDisplayLocalTimezone } from '@components/settings/workspace/utils';
import { sortByKey } from '@utils/array';

function Output({
  outputs: outputsProp,
}: {
  outputs: KernelOutputType[];
}) {
  const displayLocalTimezone = shouldDisplayLocalTimezone();

  const executionStateRef = useRef(null);
  const refLoading = useRef(null);
  const timeout = useRef(null);
  const timerRef = useRef(null);
  const timerTextRef = useRef(null);

  const outputs = useMemo(() => sortByKey(outputsProp || [], output => output?.execution_metadata?.date), [
    outputsProp,
  ]);
  const outputByType = useMemo(() => {
    const mapping = {};

    outputs?.forEach((output) => {
      const {
        data,
        error,
        message,
        msg_type: msgType,
      } = output;

      if (!(msgType in mapping)) {
        mapping[msgType] = [];
      }
      mapping[msgType].push(output);

      if (error && !isEmptyObject(error)) {
        if (!('errors' in mapping)) {
          mapping.errors = [];
        }
        mapping.errors.push(output);
      }

      if (data?.length >= 1) {
        if (!('results' in mapping)) {
          mapping.results = [];
        }
        mapping.results.push(output);
      }

      if (message?.length >= 1) {
        if (!('code' in mapping)) {
          mapping.code = [];
        }
        mapping.code.push(output);
      }
    });

    return Object.entries(mapping)?.reduce((acc, [msgType, arr]) => ({
      ...acc,
      [msgType]: sortByKey(arr || [], output => output?.execution_metadata?.date),
    }), {});
  }, [outputs]);

  const {
    code,
    error: errorInit,
    errors: errorsInit,
    results,
  } = outputByType;
  const errors = useMemo(() => [...(errorInit || []), ...(errorsInit || [])], [errorInit, errorsInit]);

  const executeInputs = useMemo(() => outputByType?.[MsgType.EXECUTE_INPUT], [outputByType]);
  const executionState = useMemo(() => outputs?.[outputs?.length - 1]?.execution_state, [outputs]);
  const executionStatus = useMemo(() => {
    if (ExecutionStateEnum.IDLE === executionState) {
      if (errors?.length >= 1) {
        return ExecutionStatusEnum.FAILED;
      } else if (!results?.length) {
        return ExecutionStatusEnum.EMPTY_RESULTS;
      } else {
        return ExecutionStatusEnum.SUCCESS;
      }
    }

    return ExecutionStatusEnum.RUNNING;
  }, [errors, executionState]);
  executionStateRef.current = executionState;

  const startTiming = () => {
    timeout.current = setTimeout(() => {
      if (timerRef?.current === null) {
        timerRef.current = 0;
      } else {
        timerRef.current += 1;
      }

      if (timerTextRef?.current) {
        timerTextRef.current.innerText = prettyUnitOfTime(Number(timerRef.current || 0));
      }

      if (ExecutionStateEnum.IDLE === executionStateRef.current) {
        clearTimeout(timeout.current);
        return;
      } else {
        startTiming();
      }
    }, 1000);
  };

  useEffect(() => {
    if (outputs?.length >= 1 && ExecutionStateEnum.IDLE !== executionStateRef.current) {
      startTiming();
    }
  }, []);

  // Group output by parent message ID; these are messages from a single request.
  // These groups will act as blocks of output.
  // console.log(parentMessage?.msg_id, msgType, messageOutput || data);

  // const data = useMemo(() => parseRawDataFromMessage(message?.data || '') || {}, [message]);
  // console.log(data);

  // Group status msg_type; if there are consecutive statuses, render them inline so that
  // it looks like they are just loading in place.
  // Show the loading bar; underneath on the left show a count up timer and on the right
  // show the most recent timestamp and update these values in place.

  // Show execution_input msg_type as additional information that isn’t the primary focus.
  // This can be a collapsable block of code that appears below the status.

  // Show execution_result msg_type as the primary information.

  // Show timestamp execution_metadata.date alongside the status and result..

  // Clicking the group block of output, user can write code and use the result as variables.

  /*
  ------------------------------------------------------------------------------------------
  start time                                               elapsed time         last updated

  > Code executing....

  > output line by line                                                  (toggle)  [timestamp]
  > output line by line                                                  (toggle)  [timestamp]
  > output line by line                                                  (toggle)  [timestamp]

  */

  const {
    statusFirst,
    statusRecent,
  } = useMemo(() => {
    const now = momentInLocalTimezone(tzMoment(), displayLocalTimezone);
    const arr = outputByType?.[MsgType.STATUS];
    const count = arr?.length;

    let first;
    if (arr?.[0]?.execution_metadata?.date) {
      first = momentInLocalTimezone(
        tzMoment(arr?.[0]?.execution_metadata?.date),
        displayLocalTimezone,
      );
    }

    let recent;
    if (count >= 2 && arr?.[count - 1]?.execution_metadata?.date) {
      recent = momentInLocalTimezone(
        tzMoment(arr?.[count - 1]?.execution_metadata?.date),
        displayLocalTimezone,
      );
    } else if (outputs?.length >= 2) {
      const outs = outputs?.filter(output => ![
        MsgType.EXECUTE_INPUT,
        MsgType.STATUS,
      ].includes(output?.msg_type));
      recent = momentInLocalTimezone(
        tzMoment(outs?.[outs?.length - 1]?.execution_metadata?.date),
        displayLocalTimezone,
      );
    }

    [first, recent].forEach((dt, idx) => {
      if (dt) {
        if (now.diff(dt, 'days') >= 1) {
          if (idx === 0) {
            first = dt.format(DATE_FORMAT_LONG_NO_SEC_WITH_OFFSET);
          } else {
            recent = dt.format(DATE_FORMAT_LONG_NO_SEC_WITH_OFFSET);
          }
        } else {
          if (idx === 0) {
            first = dt.format(TIME_FORMAT);
          } else {
            recent = dt.format(TIME_FORMAT);
          }
        }
      }
    })

    return {
      statusRecent: recent,
      statusFirst: first,
    };
  }, [displayLocalTimezone, outputByType, outputs]);

  const {
    html,
    images,
    json,
    tables,
    text,
  } = useOutputGroups({
    errors,
    outputs: results,
  });

  const outputDataMemo = useMemo(() => (
    <OutputDataCombined
      html={html}
      images={images}
      json={json}
      tables={tables}
      text={text}
    />
  ), [
    html,
    images,
    json,
    tables,
    text,
  ]);

  return (
    <>
      <Spacing mb={1}>
        <LoadingStyle isIdle={ExecutionStateEnum.IDLE === executionStateRef.current}>
          <Loading className={ExecutionStateEnum.IDLE === executionStateRef.current ? 'inactive' : 'active'} width="100%" />
        </LoadingStyle>
      </Spacing>

      <FlexContainer alignItems="flex-start" justifyContent="space-between">
        <Flex flex={1} flexDirection="column">
          <Text default monospace>
            {statusFirst}
          </Text>
          <Text
            danger={ExecutionStatusEnum.FAILED === executionStatus}
            default={ExecutionStatusEnum.CANCELLED === executionStatus}
            monospace
            success={ExecutionStatusEnum.SUCCESS === executionStatus}
            warning={ExecutionStatusEnum.EMPTY_RESULTS === executionStatus}
          >
            {ExecutionStateEnum.IDLE === executionState
              && EXECUTION_STATUS_DISPLAY_LABEL_MAPPING[executionStatus]
            }
          </Text>
        </Flex>

        <Flex flex={1} flexDirection="column" alignItems="flex-end">
          <Text default monospace>
            {statusRecent && ExecutionStateEnum.IDLE !== executionState && (
              <Text default inline monospace>
                Most recent output at
              </Text>
            )} {statusRecent || '...'}
          </Text>
          <Text default monospace ref={timerTextRef} />
        </Flex>
      </FlexContainer>

      {outputDataMemo}
    </>
  );
}

export default Output;
