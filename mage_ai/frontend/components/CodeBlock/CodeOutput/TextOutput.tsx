import React from 'react';
import Ansi from 'ansi-to-react';

import Text from '@oracle/elements/Text';
import { OutputRowStyle, OutputRowProps } from './index.style';
import { isObject } from '@utils/hash';

export type TextOutputProps = {
  value: string | { text_data: string } | { text_data: string }[];
} & OutputRowProps;

function TextOutput({ value, ...outputRowSharedProps }: TextOutputProps) {
  let textArr = [];

  if (value) {
    if (typeof value === 'string') {
      textArr = value.split('\\n');
    } else if (Array.isArray(value)) {
      textArr = value.map(v => v?.text_data);
    } else if (isObject(value)) {
      textArr = [value?.text_data];
    } else {
      textArr = [String(value)];
    }
  }

  return (
    <OutputRowStyle {...outputRowSharedProps}>
      {textArr.map((t, index) => (
        <Text key={index} monospace preWrap>
          {t?.length >= 1 && typeof t === 'string' && <Ansi>{t}</Ansi>}
          {!t?.length && <>&nbsp;</>}
        </Text>
      ))}
    </OutputRowStyle>
  );
}

export default TextOutput;
