import React from 'react';

import Divider from '@oracle/elements/Divider';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
import Panel from '@oracle/components/Panel';
import SetupSectionRowImport from './SetupSectionRow';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';

type SetupSectionProps = {
  borderless?: boolean;
  children?: any;
  dark?: boolean;
  description?: any;
  headerChildren?: any;
  noBackground?: boolean;
  title?: string | any;
};

function SetupSection({
  borderless,
  children,
  dark,
  description,
  headerChildren,
  noBackground,
  title,
}: SetupSectionProps) {
  return (
    <Panel
      borderless={borderless}
      dark={dark}
      noBackground={noBackground}
      noPadding
    >
      {title && (
        <Spacing p={PADDING_UNITS}>
          <FlexContainer alignItems="center">
            <Flex flex={1} flexDirection="column">
              <Headline level={4}>
                {title}
              </Headline>

              {description && typeof description === 'string' && (
                <Spacing mt={1}>
                  <Text muted>
                    {description}
                  </Text>
                </Spacing>
              )}
              {description && typeof description !== 'string' && description}
            </Flex>

            {headerChildren}
          </FlexContainer>
        </Spacing>
      )}

      {children && React.Children.map(children, (child, idx: number) => (
        <div key={`${title}-${idx}`}>
          <Divider light />

          {child}
        </div>
      ))}
    </Panel>
  );
}

export const SetupSectionRow = SetupSectionRowImport;
export default SetupSection;
