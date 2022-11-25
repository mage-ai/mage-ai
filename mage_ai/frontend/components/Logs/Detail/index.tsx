import { useMemo, useState } from 'react';

import Button from '@oracle/elements/Button';
import ButtonTabs, { TabType } from '@oracle/components/Tabs/ButtonTabs';
import Divider from '@oracle/elements/Divider';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Link from '@oracle/elements/Link';
import LogType from '@interfaces/LogType';
import Spacing from '@oracle/elements/Spacing';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import {
  BadgeStyle,
  BarStyle,
} from './index.style';
import { Close } from '@oracle/icons';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { formatTimestamp } from '@utils/models/log';
import { isJsonString } from '@utils/string';
import { sortByKey } from '@utils/array';

const MESSAGE_KEY = 'message';
const TAGS_KEY = 'tags';
const KEYS_TO_SKIP = [
  'error',
  'error_stack',
  'error_stacktrace',
];
const TAB_DETAILS = { uuid: 'Details' };
const TAB_ERRORS = { uuid: 'Errors' };

type LogDetailProps = {
  log: LogType;
  onClose: () => void;
};

function LogDetail({
  log,
  onClose,
}: LogDetailProps) {
  const [selectedTab, setSelectedTab] = useState<TabType>(TAB_DETAILS);
  const [showFullLogMessage, setShowFullLogMessage] = useState<boolean>(false);
  const {
    data,
    name,
    path,
  } = log;
  const {
    error,
    error_stack: errorStack,
    error_stacktrace: errorStackTrace,
    level,
    timestamp,
  } = data || {};
  const sharedProps =  { [level.toLowerCase()]: true };

  const rows = useMemo(() => {
    const arr = [
      ['file name', name],
      ['file path', path],
    ];

    Object.entries(data).forEach(([k, v]) => {
      if (!KEYS_TO_SKIP.includes(k)) {
        arr.push([k, v]);
      }
    });

    if (errorStackTrace) {
      arr.push(['error', errorStackTrace]);
    }

    return sortByKey(arr, ([k, _]) => k);
  }, [
    data,
    errorStackTrace,
    name,
    path,
  ]);

  const buttonTabs = useMemo(() => {
    const tabs = [TAB_DETAILS];
    if (error) {
      tabs.push(TAB_ERRORS);
    }

    return (
      <ButtonTabs
        onClickTab={setSelectedTab}
        selectedTabUUID={selectedTab?.uuid}
        tabs={tabs}
      />
    );
  }, [
    error,
    errorStack,
    errorStackTrace,
    selectedTab,
    setSelectedTab,
  ]);

  return (
    <div>
      <BarStyle {...sharedProps} />

      <Spacing p={PADDING_UNITS}>
        <FlexContainer
          alignItems="center"
          justifyContent="space-between"
        >
          <Flex alignItems="center">
            <BadgeStyle {...sharedProps}>
              <Text bold inverted monospace small>
                {level}
              </Text>
            </BadgeStyle>

            <Spacing mr={PADDING_UNITS} />

            <Text monospace>
              {formatTimestamp(timestamp)}
            </Text>
          </Flex>

          <Button
            iconOnly
            noBackground
            onClick={() => onClose()}
          >
            <Close size={1.5 * UNIT} />
          </Button>
        </FlexContainer>
      </Spacing>

      <Divider medium />

      <Spacing py={PADDING_UNITS}>
        {buttonTabs}
      </Spacing>

      {TAB_DETAILS.uuid === selectedTab?.uuid && (
        <Table
          columnFlex={[null, 1]}
          columnMaxWidth={(idx: number) => idx === 1 ? '100px' : null}
          rows={rows?.map(([k, v], idx) => {
            const isMessageKey = MESSAGE_KEY === k;
            const isTagsKey = TAGS_KEY === k;

            let valueToDisplay = v;
            let valueTitle = v;
            if (isTagsKey) {
              valueToDisplay = isJsonString(v)
                ? JSON.parse(JSON.stringify(v, null, 2))
                : JSON.stringify(v, null, 2);
              valueTitle = valueToDisplay;
            } else if (isMessageKey && showFullLogMessage && isJsonString(v)) {
              valueTitle = JSON.stringify(JSON.parse(v), null, 2);
              valueToDisplay = <pre>{valueTitle}</pre>;
            }

            return [
              <Text
                key={`${k}_${idx}_key`}
                monospace
                muted
              >
                {k}
              </Text>,
              <>
                <Text
                  key={`${k}_${idx}_val`}
                  monospace
                  textOverflow
                  title={valueTitle}
                  whiteSpaceNormal={(isMessageKey && showFullLogMessage) || isTagsKey}
                  wordBreak={(isMessageKey && showFullLogMessage) || isTagsKey}
                >
                  {!isTagsKey && valueToDisplay}
                  {isTagsKey && (
                    <pre>
                      {valueToDisplay}
                    </pre>
                  )}

                </Text>
                {isMessageKey &&
                  <Link
                    muted
                    onClick={() => setShowFullLogMessage(prevState => !prevState)}
                  >
                    {showFullLogMessage
                      ? 'Click to hide log'
                      : 'Click to show full log message'
                    }
                  </Link>
                }
              </>,
            ];
          })}
          uuid="LogDetail"
        />
      )}

      {TAB_ERRORS.uuid === selectedTab?.uuid && (
        <Spacing mb={5} px={PADDING_UNITS}>
          <Spacing mb={1}>
            <Text bold>
              Error
            </Text>
          </Spacing>

          {error?.map((lines: string) => lines.split('\n').map((line: string) => (
            line.split('\\n').map(part => (
              <Text
                default
                key={part}
                monospace
                preWrap
                small
              >
                {part}
              </Text>
            ))
          )))}

          {errorStack && (
            <Spacing mt={3}>
              <Spacing mb={1}>
                <Text bold>
                  Stack trace
                </Text>
              </Spacing>

              {errorStack?.map((lines: string[]) => lines?.map((line: string) => (
                <Text
                  default
                  key={line}
                  monospace
                  preWrap
                  small
                >
                  {line}
                </Text>
              )))}
            </Spacing>
          )}
        </Spacing>
      )}
    </div>
  );
}

export default LogDetail;
