import KernelOutputType from '@interfaces/KernelOutputType';
import { getMessagesWithType } from '@components/CodeBlock/utils';
import { removASCII, removeANSI } from '@utils/string';

export function getMessagesWithAndWithoutErrors(
  messages: KernelOutputType[],
  errorMessages: KernelOutputType[],
): {
  errors: string[];
  errorsCleaned: string[];
  info: string[];
  infoCleaned: string[];
  withError: KernelOutputType[];
  withoutError: KernelOutputType[];
} {
  const withoutError = [];
  const withError = [];

  const messagesWithType = getMessagesWithType(messages, errorMessages);
  messagesWithType?.forEach((message) => {
    if (message?.error) {
      withError.push(message);
    } else {
      withoutError.push(message);
    }
  });

  const errors = withError?.reduce((acc, { error }) => acc.concat(error), []);
  const errorsCleaned = errors?.map(text => removASCII(removeANSI(text)));

  const info = withoutError?.reduce((acc, {
    data,
  }) => (Array.isArray(data) && data?.every(d => typeof d === 'string'))
    ? acc.concat(data)
    : acc
  , []);

  const infoCleaned = info?.map(text => removASCII(removeANSI(text)));

  return {
    errors,
    errorsCleaned,
    info,
    infoCleaned,
    withError,
    withoutError,
  };
}
