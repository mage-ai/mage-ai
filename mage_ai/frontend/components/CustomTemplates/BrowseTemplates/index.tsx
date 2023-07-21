import {
  useContext,
  useMemo,
  useState,
} from 'react';
import { ThemeContext } from 'styled-components';
import { useRouter } from 'next/router';

import Button from '@oracle/elements/Button';
import ButtonTabs, { TabType } from '@oracle/components/Tabs/ButtonTabs';
import CustomTemplateType, { OBJECT_TYPE_BLOCKS } from '@interfaces/CustomTemplateType';
import FlexContainer from '@oracle/components/FlexContainer';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
// import TagsContainer from '@components/Tags/TagsContainer';
import TemplateDetail from '@components/CustomTemplates/TemplateDetail';
import Text from '@oracle/elements/Text';
import api from '@api';
import {
  Add,
  BlocksStacked,
} from '@oracle/icons';
import {
  CardDescriptionStyle,
  CardStyle,
  CardTitleStyle,
  CardsStyle,
  ContainerStyle,
  ContentStyle,
  ICON_SIZE,
  IconStyle,
  LinksContainerStyle,
  NavLinkStyle,
  NavigationStyle,
  SubheaderStyle,
  TabsStyle,
  // TagsStyle,
} from './index.style';
import {
  NAV_LINKS,
  NAV_TABS,
  NAV_TAB_BLOCKS,
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
  const router = useRouter();
  const themeContext = useContext(ThemeContext);

  const [addingNewTemplate, setAddingNewTemplate] = useState<boolean>(false);
  const [selectedLink, setSelectedLink] = useState<NavLinkType>(defaultLinkUUID
    ? NAV_LINKS.find(({ uuid }) => uuid === defaultLinkUUID)
    : NAV_LINKS[0],
  );
  const [selectedTab, setSelectedTab] = useState<TabType>(defaultTabUUID
    ? NAV_TABS.find(({ uuid }) => uuid === defaultTabUUID)
    : NAV_TABS[0],
  );

  const { data: dataCustomTemplates } = api.custom_templates.list({
    object_type: OBJECT_TYPE_BLOCKS,
  });
  const customTemplates: CustomTemplateType[] = useMemo(() => {
    const arr = dataCustomTemplates?.custom_templates || [];

    if (selectedLink?.filterTemplates) {
      return selectedLink?.filterTemplates(arr);
    }

    return arr;
  }, [
    dataCustomTemplates,
    selectedLink,
  ]);

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

  const cardsBlocks = useMemo(() => customTemplates?.map(({
    description,
    name,
    // tags,
    template_uuid: templateUUID,
  }) => (
    <CardStyle
      key={templateUUID}
      onClick={() => {
        router.push(
          '/templates/[...slug]',
          `/templates/${encodeURIComponent(templateUUID)}`,
        );
      }}
    >
      <CardTitleStyle>
        <Text bold monospace textOverflow>
          {templateUUID || name}
        </Text>
      </CardTitleStyle>

      <CardDescriptionStyle>
        <Text
          default={!!description}
          italic={!description}
          muted={!description}
          textOverflowLines={2}
        >
          {description || 'No description'}
        </Text>
      </CardDescriptionStyle>

      {/*<TagsStyle>
        {tags?.length >= 1 && (
          <TagsContainer
            tags={tags?.map(uuid => ({ uuid }))}
          />
        )}
      </TagsStyle>*/}
    </CardStyle>
  )), [
    customTemplates,
    router,
  ]);

  if (addingNewTemplate) {
    return (
      <TemplateDetail
      />
    );
  }

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
          {NAV_TAB_BLOCKS.uuid === selectedTab?.uuid && linksBlocks}
        </LinksContainerStyle>

        <Spacing pb={13} />
      </NavigationStyle>

      <ContentStyle>
        <SubheaderStyle>
          <Button
            beforeIcon={<Add size={ICON_SIZE} />}
            onClick={() => {
              setAddingNewTemplate(true);
            }}
            primary
          >
            New block template
          </Button>
        </SubheaderStyle>


        {NAV_TAB_BLOCKS.uuid === selectedTab?.uuid && (
          <>
            {!dataCustomTemplates && (
              <Spacing p={2}>
                <Spinner inverted />
              </Spacing>
            )}

            {dataCustomTemplates && !cardsBlocks?.length && (
              <Spacing p={2}>
                <Text>
                  There are currently no templates matching your search.
                </Text>

                <br />

                <Text>
                  Add a new template by clicking the button above.
                </Text>
              </Spacing>
            )}

            {NAV_TAB_BLOCKS.uuid === selectedTab?.uuid && cardsBlocks?.length >= 1 && (
              <CardsStyle>
                {cardsBlocks}
              </CardsStyle>
            )}
          </>
        )}
      </ContentStyle>
    </ContainerStyle>
  );
}

export default BrowseTemplates;
