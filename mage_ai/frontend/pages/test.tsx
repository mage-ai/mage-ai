import { useState } from 'react';

import useServerSentEvents from '@utils/server/events/useServerSentEvents';
import TextArea from '@oracle/elements/Inputs/TextArea';
import Button from '@oracle/elements/Button';
import Text from '@oracle/elements/Text';

function Test({
  uuid,
}: {
  uuid: string;
}) {
  const [message, setMessage] = useState('');

  const {
    errors,
    loading,
    recentEvent,
    sendMessage,
    status,
  } = useServerSentEvents(uuid);

  console.log('recentEvent', recentEvent);
  console.log('errors', errors);

  return (
    <div>
      {recentEvent && (
        <div>
          <Text>
            {recentEvent?.result?.output}
          </Text>
        </div>
      )}

      {errors?.map(({ message }) => (
        <Text key={message}>
          {message}
        </Text>
      ))}

      <TextArea
        label="Message"
        name="message"
        onChange={(e) => setMessage(e.target.value)}
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
