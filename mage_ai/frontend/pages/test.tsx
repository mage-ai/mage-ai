import { useMemo, useState } from 'react';

import Spacing from '@oracle/elements/Spacing';
import useErrorViews from '@components/ErrorPopup/useErrorViews';
import useServerSentEvents from '@utils/server/events/useServerSentEvents';
import TextArea from '@oracle/elements/Inputs/TextArea';
import Button from '@oracle/elements/Button';
import Text from '@oracle/elements/Text';
import { ErrorDetailsType } from 'interfaces/ErrorsType';
import EventStreamType, { ResultType } from '@interfaces/ServerSentEventType';
import { padString } from '@utils/string';

function ErrorDisplay({ error }: { error: ErrorDetailsType }) {
  const {
    displayMessage,
    exception,
    links,
    stackTrace,
    traceback,
  } = useErrorViews({
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

      {displayMessage && (
      <Spacing mt={1}>
        {displayMessage}
      </Spacing>
    )}

      {exception && (
      <Spacing mt={1}>
        {exception}
      </Spacing>
    )}

      {traceback && (
      <Spacing mt={2}>
        {traceback}
      </Spacing>
    )}

      {stackTrace && (
      <Spacing mt={2}>
        {stackTrace}
      </Spacing>
    )}

      {links}
    </div>
  );
}

function Test({
  uuid,
}: {
  uuid: string;
}) {
  const [message, setMessage] = useState('');

  const {
    errors,
    events,
    loading,
    sendMessage,
    status,
  } = useServerSentEvents(uuid);

  if (errors?.length) {
    console.log(errors);
  }

  const executionResultError = useMemo(() => events?.[events?.length - 1]?.result?.error, [events]);
  const eventsDisplay = useMemo(() => events?.filter(event => !!event), [events]);
  const stdoutCount = useMemo(() => eventsDisplay?.filter(event => event?.result?.type === ResultType.STDOUT)?.length || 0, [eventsDisplay]);

  return (
    <div>
      {executionResultError && <ErrorDisplay error={executionResultError} />}

      {eventsDisplay?.map((eventStream, idx: number) => {
        if (!eventStream) {
          return null;
        }

        const {
          event_uuid: eventUUID,
          result,
          timestamp,
        }: EventStreamType = eventStream;
        const {
          output,
        } = result || {
          output: null,
        };

        return (
          <div key={eventUUID}>
            <Text monospace>
              {padString(`[${idx}]`, stdoutCount - 1, ' ')} {output}
            </Text>
          </div>
        );
      })}

      <TextArea
        autoGrow
        label="Message"
        monospace
        name="message"
        onChange={(e) => setMessage(e.target.value)}
        rows={12}
      />
      <Button
        loading={loading}
        onClick={() => sendMessage({ message })}
      >
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
