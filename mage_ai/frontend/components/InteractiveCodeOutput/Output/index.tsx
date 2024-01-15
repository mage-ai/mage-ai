import { useMemo } from 'react';

import KernelOutputType from '@interfaces/KernelOutputType';
import Text from '@oracle/elements/Text';
import { parseRawDataFromMessage } from '@utils/models/kernel/utils';

function Output({
  outputs,
}: {
  outputs: KernelOutputType[];
}) {
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

  return (
    <Text>
      Hello
    </Text>
  );
}

export default Output;
