import KernelOutputType from '@interfaces/KernelOutputType';
import { getMessagesWithType } from '@components/CodeBlock/utils';
import { removASCII, removeANSI } from '@utils/string';

export function getMessagesWithAndWithoutErrors(
  messages: KernelOutputType[],
  errorMessages: string[],
): {
  allContentCleaned: string[];
  errors: string[];
  errorsCleaned: string[];
  info: string[];
  infoCleaned: string[];
  withError: KernelOutputType[];
  withoutError: KernelOutputType[];
} {
  const allContent = [];
  const withoutError = [];
  const withError = [];

  const messagesWithType = getMessagesWithType(messages, errorMessages);
  messagesWithType?.forEach((message) => {
    if (message?.error) {
      withError.push(message);
      allContent.push(message?.error);
    } else {
      withoutError.push(message);
      allContent.push(message?.data);
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

  const allContentCleaned = allContent?.reduce((
    acc,
    data,
  ) => (Array.isArray(data) && data?.every(d => typeof d === 'string'))
    ? acc.concat(data)
    : acc
  , [])?.map(text => removASCII(removeANSI(text)));

  return {
    allContentCleaned,
    errors,
    errorsCleaned,
    info,
    infoCleaned,
    withError,
    withoutError,
  };
}
