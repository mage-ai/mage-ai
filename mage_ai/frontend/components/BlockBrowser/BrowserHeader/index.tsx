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
  children?: any;
  navigateBack?: (value?: number) => void;
  selectedLinks?: NavLinkType[];
  selectedTab?: TabType;
};

function BrowserHeader({
  children,
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
        <Spacing pl={PADDING_UNITS} />

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
                onClick={() => navigateBack?.(navLinksCount || 1)}
                preventDefault
              >
                <FlexContainer alignItems="center">
                  {selectedTab?.Icon && (
                      <>
                        <selectedTab.Icon />

                        <Spacing mr={1} />
                      </>
                    )}

                  <Text bold muted>
                    {selectedTab?.label
                      ? selectedTab?.label?.()
                      : capitalizeRemoveUnderscoreLower(selectedTab?.uuid)
                    }
                  </Text>
                </FlexContainer>
              </Link>
            </>
          )}

          {navLinks?.map((selectedLink, idx: number) => {
            const {
              Icon,
              label,
              uuid,
            } = selectedLink || {
              Icon: null,
              label: null,
              uuid: null,
            };

            return (
              <FlexContainer alignItems="center" key={uuid}>
                {(selectedTab || idx >= 1) && (
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
                    {Icon && (
                      <>
                        <Icon default={idx >= 1 && navLinks?.length >= 3} />

                        <Spacing mr={1} />
                      </>
                    )}
                    <Text bold muted={idx !== navLinksCount - 1} noWrapping>
                      {BLOCK_TYPE_NAME_MAPPING[uuid]
                        || label
                          ? label?.({
                            selectedLinks,
                          })
                          : uuid
                      }
                    </Text>
                  </FlexContainer>
                </Link>
              </FlexContainer>
            );
          })}

        </FlexContainer>

        {(selectedTab || selectedLinks?.length >= 1) && children && <Spacing mr={PADDING_UNITS} />}

        {children}

        <Spacing pr={PADDING_UNITS} />
      </FlexContainer>
    </HeaderStyle>
  );
}

export default BrowserHeader;
