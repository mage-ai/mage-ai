import React from 'react';

import Button from '@oracle/elements/Button';
import Select from '@oracle/elements/Inputs/Select';
import FlexContainer from '@oracle/components/FlexContainer';
import Mage8Bit from '@oracle/icons/custom/Mage8Bit';
import Text from '@oracle/elements/Text';
import { Add, Close } from '@oracle/icons';
import { UNIT } from '@oracle/styles/units/spacing';
import {
  WindowContainerStyle,
  WindowContentStyle,
  WindowFooterStyle,
  WindowHeaderStyle,
} from './index.style';

type RecommendationsWindowProps = {
  children?: JSX.Element;
};

function RecommendationsWindow({
  children,
}: RecommendationsWindowProps) {
  return (
    <WindowContainerStyle>
      <WindowHeaderStyle>
        <FlexContainer alignItems="center">
          <Text>
            Header
          </Text>
        </FlexContainer>
      </WindowHeaderStyle>
      <WindowContentStyle>
        {React.Children.count(children) === 0
          ? 
            <Text>
              No recommendations available
            </Text>
          : children
        }
      </WindowContentStyle>
      <WindowFooterStyle>
        Footer
      </WindowFooterStyle>
    </WindowContainerStyle>
  );
}

export default RecommendationsWindow;
