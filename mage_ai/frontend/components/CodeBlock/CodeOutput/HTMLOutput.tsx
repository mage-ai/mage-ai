import React from 'react';
import InnerHTML from 'dangerously-set-html-content';

import { OutputRowStyle, HTMLOutputStyle, OutputRowProps } from './index.style';

type HTMLOutputProps = {
  value: string;
} & OutputRowProps;

function HTMLOutput({ value, ...outputRowSharedProps }: HTMLOutputProps) {
  return (
    <OutputRowStyle {...outputRowSharedProps}>
      <HTMLOutputStyle monospace>
        <InnerHTML html={value} />
      </HTMLOutputStyle>
    </OutputRowStyle>
  );
}

export default HTMLOutput;
