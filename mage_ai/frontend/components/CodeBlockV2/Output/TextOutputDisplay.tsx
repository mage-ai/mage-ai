import { useState } from 'react';

import Button from '@oracle/elements/Button';
import Checkbox from '@oracle/elements/Checkbox';
import CopyToClipboard from '@oracle/components/CopyToClipboard';
import FlexContainer from '@oracle/components/FlexContainer';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import { Copy } from '@oracle/icons';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';

type TextOutputDisplayProps = {
  allContentCleaned?: string[];
  contentAll?: any[];
  contentNoErrors?: any[];
  contentWithErrors?: any[];
  errorsCleaned?: string[];
  infoCleaned?: string[];
}

function TextOutputDisplay({
  allContentCleaned,
  contentAll,
  contentNoErrors,
  contentWithErrors,
  errorsCleaned,
  infoCleaned,
}: TextOutputDisplayProps) {
  const [option, setOption] = useState(0);

  return (
    <>
      <Spacing p={PADDING_UNITS}>
        <FlexContainer justifyContent="space-between">
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

          <FlexContainer>
            {allContentCleaned?.length >= 1 && (
              <FlexContainer>
                <CopyToClipboard
                  copiedText={0 === option
                    ? allContentCleaned?.join('\n')
                    : 1 === option
                      ? errorsCleaned?.join('\n')
                      : infoCleaned?.join('\n')
                  }
                  monospace
                  withCopyIcon
                >
                  <Button
                    beforeIcon={<Copy inverted />}
                    compact
                    onClick={() => true}
                    small
                    warning
                  >
                    Copy {0 === option ? 'all' : 1 === option ? 'error' : 'info'} logs to clipboard
                  </Button>
                </CopyToClipboard>
              </FlexContainer>
            )}
          </FlexContainer>
        </FlexContainer>
      </Spacing>

      {0 === option && contentAll}
      {1 === option && contentWithErrors}
      {2 === option && contentNoErrors}
    </>
  );
}

export default TextOutputDisplay;
