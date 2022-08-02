import React from 'react';

import Button from '@oracle/elements/Button';
import Select from '@oracle/elements/Inputs/Select';
import Spacing from '@oracle/elements/Spacing';
import Flex from '@oracle/components/Flex';
import MageIcon from '@oracle/icons/custom/Mage8Bit';
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
  const recsCount = React.Children.count(children);

  return (
    <WindowContainerStyle>
      <WindowHeaderStyle>
        <Flex alignItems="center">
          <MageIcon />
          <Spacing pr={1} />
          <Text>
            Block Dropdown
          </Text>
        </Flex>
        <Button iconOnly>
          <Close muted />
        </Button>
      </WindowHeaderStyle>
      <WindowContentStyle>
        {recsCount === 0
          ? 
            <Text>
              No recommendations available
            </Text>
          : children
        }
      </WindowContentStyle>
      <WindowFooterStyle>
        <Text default monospace>
          {recsCount} results
        </Text>
        <Button
          beforeIcon={<Add size={UNIT * 2} />}
          secondaryGradient
        >
          Add selected
        </Button>
      </WindowFooterStyle>
    </WindowContainerStyle>
  );
}

export default RecommendationsWindow;
