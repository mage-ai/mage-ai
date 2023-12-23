import { useMemo } from 'react';

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
  selectedLinks?: NavLinkType[];
  selectedTab?: TabType;
};

function BrowserHeader({
  navigateBack,
  selectedLinks,
  selectedTab,
}: BrowserHeaderPropsProps) {
  const navLinks = useMemo(() => {
    const arr = [...(selectedLinks || [])];
    arr.reverse();

    return arr;
  }, [selectedLinks]);

  const navLinksCount = useMemo(() => navLinks?.length || 0, [navLinks]);

  return (
    <HeaderStyle>
      <FlexContainer alignItems="center" fullHeight>
        <Spacing px={PADDING_UNITS}>
          <FlexContainer alignItems="center">
            {selectedTab && (
              <>
                <Link
                  block
                  noHoverUnderline
                  onClick={() => navigateBack?.()}
                  preventDefault
                >
                  <FlexContainer alignItems="center">
                    <ArrowLeft muted />
                  </FlexContainer>
                </Link>

                <Spacing pr={1} />
                <Link
                  block
                  noHoverUnderline
                  onClick={() => navigateBack?.(navLinksCount)}
                  preventDefault
                >
                  <FlexContainer alignItems="center">
                    <Text bold muted>
                      {capitalizeRemoveUnderscoreLower(selectedTab?.uuid)}
                    </Text>
                  </FlexContainer>
                </Link>
              </>
            )}

            {navLinks?.map((selectedLink, idx: number) => {
              return (
                <FlexContainer alignItems="center" key={selectedLink?.uuid}>
                  {selectedTab && (
                    <>
                      <Spacing mr={1} />

                      <ChevronRight muted />

                      <Spacing mr={1} />
                    </>
                  )}

                  <Link
                    block
                    noHoverUnderline
                    onClick={() => navigateBack?.((navLinksCount - 1) - idx)}
                    preventDefault
                  >
                    <FlexContainer alignItems="center">
                      <Text bold muted={idx !== navLinksCount - 1}>
                        {BLOCK_TYPE_NAME_MAPPING[selectedLink?.uuid] || selectedLink?.label?.()}
                      </Text>
                    </FlexContainer>
                  </Link>
                </FlexContainer>
              );
            })}
          </FlexContainer>
        </Spacing>
      </FlexContainer>
    </HeaderStyle>
  );
}

export default BrowserHeader;
