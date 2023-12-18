import Divider from '@oracle/elements/Divider';
import FlexContainer from '@oracle/components/FlexContainer';
import Link from '@oracle/elements/Link';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import { ArrowLeft, ChevronRight } from '@oracle/icons';
import { BLOCK_TYPE_NAME_MAPPING, BlockTypeEnum } from '@interfaces/BlockType';
import { FileContextTab, NavLinkUUIDEnum } from '../FileBrowserNavigation/constants';
import { HeaderStyle } from './index.style';
import { NavLinkType } from '@components/CustomTemplates/BrowseTemplates/constants';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { TabType } from '@oracle/components/Tabs/ButtonTabs';
import { capitalizeRemoveUnderscoreLower } from '@utils/string';

type BrowserHeaderPropsProps = {
  navigateBack?: () => void;
  selectedLink?: NavLinkType;
  selectedTab?: TabType;
};

function BrowserHeader({
  navigateBack,
  selectedLink,
  selectedTab,
}: BrowserHeaderPropsProps) {
  return (
    <HeaderStyle>
      <FlexContainer alignItems="center" fullHeight>
        <Spacing px={PADDING_UNITS}>
          <FlexContainer alignItems="center">

            {selectedTab && (
              <Link
                block
                noHoverUnderline
                onClick={() => navigateBack?.()}
                preventDefault
              >
                <FlexContainer alignItems="center">
                {!!selectedLink && (
                  <>
                    <ArrowLeft muted />

                    <Spacing mr={1} />
                  </>
                )}

                  <Text bold muted={!!selectedLink}>
                    {capitalizeRemoveUnderscoreLower(
                      NavLinkUUIDEnum.ALL_BLOCKS === selectedLink?.uuid
                        ? FileContextTab.FILES
                        : selectedTab?.uuid || '',
                    )}
                  </Text>
                </FlexContainer>
              </Link>
            )}

            {FileContextTab.BLOCKS === selectedTab?.uuid && selectedLink && (
              <>
                <Spacing mr={1} />

                <ChevronRight muted />

                <Spacing mr={1} />

                <FlexContainer alignItems="center">
                  <Text bold default={!selectedTab}>
                    {BLOCK_TYPE_NAME_MAPPING[selectedLink?.uuid] || selectedLink?.label?.()}
                  </Text>
                </FlexContainer>
              </>
            )}
          </FlexContainer>
        </Spacing>
      </FlexContainer>
    </HeaderStyle>
  );
}

export default BrowserHeader;
