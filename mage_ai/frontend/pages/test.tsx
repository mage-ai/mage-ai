import { useState } from 'react';

import useServerSentEvents from '@utils/server/events/useServerSentEvents';
import TextArea from '@oracle/elements/Inputs/TextArea';
import Button from '@oracle/elements/Button';
import Text from '@oracle/elements/Text';

function Test() {
  const [message, setMessage] = useState('');

  const {
    errors,
    loading,
    recentEvent,
    sendMessage,
    status,
  } = useServerSentEvents('test');

  return (
    <div>
      {recentEvent && (
        <div>
          <Text>
            {recentEvent?.data}
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

export default Test;
