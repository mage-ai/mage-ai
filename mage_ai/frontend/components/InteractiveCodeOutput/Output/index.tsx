import { useMemo } from 'react';

import KernelOutputType from '@interfaces/KernelOutputType';
import Text from '@oracle/elements/Text';
import { parseRawDataFromMessage } from '@utils/models/kernel/utils';

function Output({
  message,
}: {
  message: KernelOutputType;
}) {
  const data = useMemo(() => parseRawDataFromMessage(message?.data || '') || {}, [message]);
  console.log(data);

  return (
    <Text>
      Hello
    </Text>
  );
}

export default Output;
