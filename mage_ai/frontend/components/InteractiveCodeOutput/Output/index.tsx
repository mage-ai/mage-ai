import tzMoment from 'moment-timezone';
import { forwardRef, useEffect, useMemo, useRef, useState } from 'react';

import ButtonTabs, { TabType } from '@oracle/components/Tabs/ButtonTabs';
import Divider from '@oracle/elements/Divider';
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
import Link from '@oracle/elements/Link';
import OutputDataCombined from './OutputDataCombined';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import Tooltip from '@oracle/components/Tooltip';
import useOutputGroups from './useOutputGroups';
import { DATE_FORMAT_LONG_NO_SEC_WITH_OFFSET, TIME_FORMAT, DATE_FORMAT_LONG_MS, momentInLocalTimezone } from '@utils/date';
import { RowGroupStyle, LoadingStyle, HeaderStyle } from './index.style';
import { isEmptyObject } from '@utils/hash';
import { parseRawDataFromMessage } from '@utils/models/kernel/utils';
import { prettyUnitOfTime } from '@utils/string';
import { generalizeMsgID } from '@utils/models/kernel/utils';
import { shouldDisplayLocalTimezone } from '@components/settings/workspace/utils';
import { sortByKey } from '@utils/array';
import { pauseEvent } from '@utils/events';

export const ROW_GROUP_CLASS_NAME = 'row-group';
export const ROW_GROUP_HEADER_CLASS_NAME = 'row-group-header';

function Output({
  dates,
  groupID,
  groupsCount,
  index,
  onClick,
  outputs: outputsProp,
}: {
  dates: string[];
  groupID: string;
  groupsCount: number;
  index: number;
  onClick?: (e: Event) => void;
  outputs: KernelOutputType[];
}, ref) {
  const displayLocalTimezone = shouldDisplayLocalTimezone();

  const [inactive, setInactive] = useState(false);

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
        return [ExecutionStatusEnum.FAILED, ExecutionStateEnum.IDLE];
      } else if (!results?.length) {
        return [ExecutionStatusEnum.EMPTY_RESULTS, ExecutionStateEnum.IDLE];
      } else {
        return [ExecutionStatusEnum.SUCCESS, ExecutionStateEnum.IDLE];
      }
    } else if (executeInputs?.length >= 1) {
      return [ExecutionStatusEnum.RUNNING, ExecutionStateEnum.BUSY];
    } else if (outputs?.length >= 1) {
      return [ExecutionStatusEnum.PENDING, ExecutionStateEnum.QUEUED];
    }

    return [ExecutionStatusEnum.PENDING, ExecutionStateEnum.BUSY];
  }, [errors, executionState, executeInputs])[0];
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

  const now = momentInLocalTimezone(tzMoment(), displayLocalTimezone);

  const datetimeSmallest = dates?.length >= 1
    ? momentInLocalTimezone(tzMoment(dates?.[0]), displayLocalTimezone)
    : null;
  const dateFull = datetimeSmallest && datetimeSmallest.format(DATE_FORMAT_LONG_NO_SEC_WITH_OFFSET);
  const timeFull = datetimeSmallest && datetimeSmallest.format(TIME_FORMAT);

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

  const outputMemo = useMemo(() => (
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

  const hasErrors = useMemo(() => errors?.length >= 1, [errors]);
  useEffect(() => {
    setInactive(hasErrors
      || (outputs?.length === 1 && outputs?.msg_type === MsgType.STATUS)
      || (outputs?.length === 1 && index < groupsCount && outputs?.[0]?.execution_metadata?.date && now.diff(outputs?.[0]?.execution_metadata?.date, 'minutes') >= 4)
      || ExecutionStateEnum.IDLE === executionState);
  }, [outputs]);

  return (
    <RowGroupStyle
      className={[
        ROW_GROUP_CLASS_NAME,
        inactive ? 'inactive' : 'active',
        hasErrors ? 'errors' : '',
      ]?.filter(c => !!c)?.join(' ')}
      key={`${groupID}-${index}`}
      onClick={(e) => {
        if (onClick) {
          onClick?.(e);
        }
      }}
      ref={ref}
    >
      <LoadingStyle inactive={inactive}>
        <Loading width="100%" />
      </LoadingStyle>

      <HeaderStyle className={ROW_GROUP_HEADER_CLASS_NAME}>
        <FlexContainer alignItems="flex-start" justifyContent="space-between">
          <Flex alignItems="center" flex={1} flexDirection="row" style={{ position: 'relative' }} >
            <Tooltip
              appearBefore
              block
              label={(
                <Text default monospace small>
                  {datetimeSmallest ? datetimeSmallest.format(DATE_FORMAT_LONG_MS) : null}
                </Text>
              )}
              size={null}
              visibleDelay={300}
              widthFitContent
            >
              <Text default monospace small>
                {datetimeSmallest
                  ? (now.diff(datetimeSmallest, 'days') >= 1 ? dateFull : timeFull)
                  : null
                }
              </Text>
            </Tooltip>

            <Spacing mr={1} />

            {/*<Text
              danger={ExecutionStatusEnum.FAILED === executionStatus}
              default={ExecutionStatusEnum.CANCELLED === executionStatus}
              monospace
              success={ExecutionStatusEnum.SUCCESS === executionStatus}
              warning={ExecutionStatusEnum.EMPTY_RESULTS === executionStatus}
              small
            >
              {ExecutionStateEnum.IDLE === executionState
                && EXECUTION_STATUS_DISPLAY_LABEL_MAPPING[executionStatus]
              }
            </Text>*/}
          </Flex>

          <Flex flex={1} flexDirection="column" alignItems="flex-end">
            {timeout?.current && !inactive && <Text default monospace ref={timerTextRef} small />}

            <Spacing mr={1} />

            <Tooltip
              appearBefore
              block
              label={(
                <Text default monospace small>
                  {groupID}
                </Text>
              )}
              size={null}
              visibleDelay={300}
              widthFitContent
            >
              <Link
                noOutline
                onClick={(e) => {
                  pauseEvent(e);
                }}
                preventDefault
              >
                <Text muted monospace small>
                  {generalizeMsgID(groupID || '', {
                    medium: true,
                  })}
                </Text>
              </Link>
            </Tooltip>
          </Flex>
        </FlexContainer>
      </HeaderStyle>

      {outputMemo && (
        <>
          {outputMemo}

          <Spacing pb={1} />
        </>
      )}
    </RowGroupStyle>
  );
}

export default forwardRef(Output);
