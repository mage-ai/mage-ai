import Divider from '@oracle/elements/Divider';
import FlexContainer from '@oracle/components/FlexContainer';
import Link from '@oracle/elements/Link';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import { ArrowLeft, ChevronRight } from '@oracle/icons';
import { BLOCK_TYPE_NAME_MAPPING, BlockTypeEnum } from '@interfaces/BlockType';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { TabType } from '@oracle/components/Tabs/ButtonTabs';
import { capitalizeRemoveUnderscoreLower } from '@utils/string';

type BrowserHeaderPropsProps = {
  blockType: BlockTypeEnum;
  selectedTab?: TabType;
};

function BrowserHeader({
  blockType,
  selectedTab,
}: BrowserHeaderPropsProps) {
  return (
    <>
      <Spacing p={PADDING_UNITS}>
        <FlexContainer alignItems="center">

          {selectedTab && (
            <Link
              block
              noHoverUnderline
            >
              <FlexContainer alignItems="center">
              {!!blockType && (
                <>
                  <ArrowLeft muted />

                  <Spacing mr={1} />
                </>
              )}

                <Text bold muted={!!blockType}>
                  {capitalizeRemoveUnderscoreLower(selectedTab?.uuid || '')}
                </Text>
              </FlexContainer>
            </Link>
          )}

          {selectedTab && blockType && (
            <>
              <Spacing mr={1} />

              <ChevronRight muted />

              <Spacing mr={1} />
            </>
          )}

          {blockType && (
            <FlexContainer alignItems="center">
              <Text bold default={!selectedTab}>
                {blockType && BLOCK_TYPE_NAME_MAPPING[blockType]}
              </Text>
            </FlexContainer>
          )}
        </FlexContainer>
      </Spacing>

      <Divider light />
    </>
  );
}

export default BrowserHeader;
