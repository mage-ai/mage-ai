import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import { ContainerStyle, EditorStyle, MenuStyle } from './index.style';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';

type MainContentProps = {
  children: any;
  sideMenuVisible: boolean;
};

function MainContent({
  children,
  sideMenuVisible,
}: MainContentProps) {
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
              {children}
            </EditorStyle>
          </>
        )}
      </ContainerStyle>

      {!sideMenuVisible && (
        <EditorStyle solo>
          {children}
        </EditorStyle>
      )}
    </>
  );
}

export default MainContent;
