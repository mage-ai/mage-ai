import Ansi from 'ansi-to-react';
import { useMemo, useState } from 'react';

import Spacing from '@oracle/elements/Spacing';
import FlexContainer from '@oracle/components/FlexContainer';
import Flex from '@oracle/components/Flex';
import useErrorViews from '@components/ErrorPopup/useErrorViews';
import useEventStreams from '@utils/server/events/useEventStreams';
import { DATE_FORMAT_LONG_MS } from '@utils/date';
import moment from 'moment';
import TextArea from '@oracle/elements/Inputs/TextArea';
import { displayLocalOrUtcTime } from '@components/Triggers/utils';
import { shouldDisplayLocalTimezone } from '@components/settings/workspace/utils';
import Button from '@oracle/elements/Button';
import Text from '@oracle/elements/Text';
import { ErrorDetailsType } from 'interfaces/ErrorsType';
import EventStreamType, { ResultType } from '@interfaces/EventStreamType';
import { padString } from '@utils/string';

function ErrorDisplay({ error }: { error: ErrorDetailsType }) {
  const { displayMessage, exception, links, stackTrace, traceback } = useErrorViews({
    response: {
      error,
    },
    stackTraceVisible: true,
    tracebackVisible: true,
  });

  return (
    <div>
      <Text bold large>
        Error
      </Text>

      {displayMessage && <Spacing mt={1}>{displayMessage}</Spacing>}

      {exception && <Spacing mt={1}>{exception}</Spacing>}

      {traceback && <Spacing mt={2}>{traceback}</Spacing>}

      {stackTrace && <Spacing mt={2}>{stackTrace}</Spacing>}

      {links}
    </div>
  );
}

function Test({ uuid }: { uuid: string }) {
  const displayLocalTimezone = shouldDisplayLocalTimezone();
  const [message, setMessage] = useState('');

  const { errors, events, loading, sendMessage, status } = useEventStreams(uuid);

  if (errors?.length) {
    console.log(errors);
  }

  const executionResultError = useMemo(() => events?.[events?.length - 1]?.result?.error, [events]);
  const eventsDisplay = useMemo(() => events?.filter(event => !!event), [events]);
  const stdoutCount = useMemo(
    () => eventsDisplay?.filter(event => event?.result?.type === ResultType.STDOUT)?.length || 0,
    [eventsDisplay],
  );

  console.log(events);

  return (
    <div>
      {executionResultError && <ErrorDisplay error={executionResultError} />}

      {eventsDisplay?.map((eventStream, idx: number) => {
        if (!eventStream) {
          return null;
        }

        const { event_uuid: eventUUID, result, timestamp }: EventStreamType = eventStream;
        const { output, output_text: outputText } = result || {
          output: null,
          output_text: null,
        };

        const indexText =
          padString('', String(stdoutCount).length - String(idx).length, '&nbsp;') + `[${idx}]`;

        return (
          <div key={eventUUID}>
            <FlexContainer alignItems="flex-start" fullWidth justifyContent="space-between">
              <Flex>
                <Text monospace preWrap>
                  <Text default inline monospace>
                    <span dangerouslySetInnerHTML={{ __html: indexText }} />
                  </Text>{' '}
                  <Ansi>{outputText}</Ansi>
                </Text>
              </Flex>

              <Text monospace muted>
                {displayLocalOrUtcTime(
                  moment(timestamp).format(DATE_FORMAT_LONG_MS),
                  displayLocalTimezone,
                  DATE_FORMAT_LONG_MS,
                )}
              </Text>
            </FlexContainer>
          </div>
        );
      })}

      <TextArea
        autoGrow
        label="Message"
        monospace
        name="message"
        onChange={e => setMessage(e.target.value)}
        rows={12}
      />
      <Button loading={loading} onClick={() => sendMessage({ message })}>
        Send Message ({status})
      </Button>
    </div>
  );
}

Test.getInitialProps = async (ctx: any) => {
  const { uuid }: { uuid?: string } = ctx.query;

  return {
    uuid,
  };
};

export default Test;
