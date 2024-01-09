import { useMemo } from 'react';

import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import { ContainerStyle, EditorStyle, MenuStyle } from './index.style';
import { HeaderTabType } from '../constants';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { TabType } from '@oracle/components/Tabs/ButtonTabs';

type MainContentProps = {
  children: any;
  selectedHeaderTab?: TabType;
  sideMenuVisible: boolean;
} & HeaderTabType;

function MainContent({
  children,
  renderTabContent,
  selectedHeaderTab,
  sideMenuVisible,
}: MainContentProps) {
  const content = useMemo(() => {
    const children2 = sideMenuVisible
      ? children
      : (
        <EditorStyle solo>
          {children}
        </EditorStyle>
      );

    if (renderTabContent && selectedHeaderTab) {
      return renderTabContent(selectedHeaderTab, children2);
    }

    return children2;
  }, [
    children,
    renderTabContent,
    selectedHeaderTab,
    sideMenuVisible,
  ]);

  return (
    <>
      <ContainerStyle>
        {sideMenuVisible && (
          <>
            <MenuStyle>
              <FlexContainer flexDirection="column">
                <Spacing p={PADDING_UNITS}>
                  <Text>
                    Space for a menu
                  </Text>
                </Spacing>
              </FlexContainer>
            </MenuStyle>

            <EditorStyle>
              {content}
            </EditorStyle>
          </>
        )}
      </ContainerStyle>

      {!sideMenuVisible && content}
    </>
  );
}

export default MainContent;
