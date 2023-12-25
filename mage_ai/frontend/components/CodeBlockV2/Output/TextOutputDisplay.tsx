import { useState } from 'react';

import Checkbox from '@oracle/elements/Checkbox';
import FlexContainer from '@oracle/components/FlexContainer';
import Spacing from '@oracle/elements/Spacing';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';

function TextOutputDisplay({
  contentAll,
  contentNoErrors,
  contentWithErrors,
}) {
  const [option, setOption] = useState(0);

  return (
    <>
      <Spacing p={PADDING_UNITS}>
        <FlexContainer>
          <Checkbox
            label="All logs"
            checked={0 === option}
            onClick={() => setOption(prev => prev === 0 ? 0 : 0)}
          />

          <Spacing mr={2} />

          <Checkbox
            label="Errors"
            checked={1 === option}
            onClick={() => setOption(prev => prev === 1 ? 0 : 1)}
          />

          <Spacing mr={2} />

          <Checkbox
            label="Info"
            checked={2 === option}
            onClick={() => setOption(prev => prev === 2 ? 0 : 2)}
          />
        </FlexContainer>
      </Spacing>

      {0 === option && contentAll}
      {1 === option && contentWithErrors}
      {2 === option && contentNoErrors}
    </>
  );
}

export default TextOutputDisplay;
