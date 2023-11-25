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
  children: any;
  description?: any;
  headerChildren?: any;
  title: string | any;
};

function SetupSection({
  children,
  description,
  headerChildren,
  title,
}: SetupSectionProps) {
  return (
    <Panel noPadding>
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

      {React.Children.map(children, (child, idx: number) => (
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
