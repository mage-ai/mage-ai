import {
  useContext,
  useMemo,
  useState,
} from 'react';
import { ThemeContext } from 'styled-components';

import ButtonTabs, { TabType } from '@oracle/components/Tabs/ButtonTabs';
import FlexContainer from '@oracle/components/FlexContainer';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import {
  BlocksStacked,
} from '@oracle/icons';
import {
  ContainerStyle,
  ICON_SIZE,
  IconStyle,
  NavLinkStyle,
  NavigationStyle,
  TabsStyle,
  LinksContainerStyle,
} from './index.style';
import {
  NAV_LINKS,
  NAV_TABS,
  NavLinkType,
} from './constants';

type BrowseTemplatesProps = {
  defaultLinkUUID?: string;
  defaultTabUUID?: TabType;
};

function BrowseTemplates({
  defaultLinkUUID,
  defaultTabUUID,
}: BrowseTemplatesProps) {
  const themeContext = useContext(ThemeContext);

  const [selectedLink, setSelectedLink] = useState<NavLinkType>(defaultLinkUUID
    ? NAV_LINKS.find(({ uuid }) => uuid === defaultLinkUUID)
    : NAV_LINKS[0],
  );
  const [selectedTab, setSelectedTab] = useState<TabType>(defaultTabUUID
    ? NAV_TABS.find(({ uuid }) => uuid === defaultTabUUID)
    : NAV_TABS[0]
  );

  const linksBlocks = useMemo(() => NAV_LINKS.map((navLink: NavLinkType) => {
    const {
      Icon,
      label,
      selectedBackgroundColor,
      selectedIconProps,
      uuid,
    } = navLink;
    const isSelected = selectedLink?.uuid === uuid;
    const IconProps = {
      size: ICON_SIZE,
      ...(isSelected && selectedIconProps ? selectedIconProps : {}),
    };

    return (
      <NavLinkStyle
        key={uuid}
        onClick={() => setSelectedLink(navLink)}
        selected={isSelected}
      >
        <FlexContainer alignItems="center">
          <IconStyle
            backgroundColor={isSelected && selectedBackgroundColor
              ? selectedBackgroundColor(themeContext)
              : null
            }
          >
            {Icon ? <Icon {...IconProps} /> : <BlocksStacked {...IconProps} />}
          </IconStyle>

          <Text bold large>
            {label ? label() : uuid}
          </Text>
        </FlexContainer>
      </NavLinkStyle>
    );
  }), [
    selectedLink,
    themeContext,
  ]);

  return (
    <ContainerStyle>
      <NavigationStyle>
        <TabsStyle>
          <ButtonTabs
            noPadding
            onClickTab={(tab: TabType) => {
              setSelectedTab(tab);
            }}
            selectedTabUUID={selectedTab?.uuid}
            tabs={NAV_TABS}
          />
        </TabsStyle>

        <LinksContainerStyle>
          {linksBlocks}
        </LinksContainerStyle>

        <Spacing pb={13} />
      </NavigationStyle>
    </ContainerStyle>
  );
}

export default BrowseTemplates;
