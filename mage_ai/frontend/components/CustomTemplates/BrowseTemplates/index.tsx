import {
  useContext,
  useMemo,
  useState,
} from 'react';
import { ThemeContext } from 'styled-components';
import { useRouter } from 'next/router';

import Breadcrumbs, { BreadcrumbType } from '@components/Breadcrumbs';
import Button from '@oracle/elements/Button';
import ButtonTabs, { TabType } from '@oracle/components/Tabs/ButtonTabs';
import CustomTemplateType, {
  OBJECT_TYPE_BLOCKS,
  OBJECT_TYPE_PIPELINES,
} from '@interfaces/CustomTemplateType';
import FlexContainer from '@oracle/components/FlexContainer';
import PipelineTemplateDetail from '@components/CustomTemplates/PipelineTemplateDetail';
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
import { BlockTypeEnum } from '@interfaces/BlockType';
import {
  BreadcrumbsStyle,
  CardDescriptionStyle,
  CardStyle,
  CardTitleStyle,
  CardsStyle,
  ContainedStyle,
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
  NAV_TAB_PIPELINES,
  NavLinkType,
} from './constants';
import { PipelineTypeEnum } from '@interfaces/PipelineType';
import { useWindowSize } from '@utils/sizes';

type BrowseTemplatesProps = {
  contained?: boolean;
  defaultLinkUUID?: string;
  defaultTabUUID?: TabType;
  objectType?: string;
  onClickCustomTemplate?: (customTemplate: CustomTemplateType) => void;
  pipelineUUID?: string;
  showAddingNewTemplates?: boolean;
  showBreadcrumbs?: boolean;
};

function BrowseTemplates({
  contained,
  defaultLinkUUID,
  defaultTabUUID,
  objectType,
  onClickCustomTemplate,
  pipelineUUID,
  showAddingNewTemplates,
  showBreadcrumbs,
}: BrowseTemplatesProps) {
  const router = useRouter();
  const themeContext = useContext(ThemeContext);
  const { height, width } = useWindowSize();

  const [addingNewTemplate, setAddingNewTemplate] =
    useState<boolean>(showAddingNewTemplates || false);
  const [selectedLink, setSelectedLink] = useState<NavLinkType>(defaultLinkUUID
    ? NAV_LINKS.find(({ uuid }) => uuid === defaultLinkUUID)
    : NAV_LINKS[0],
  );
  const [selectedTab, setSelectedTab] = useState<TabType>(defaultTabUUID
    ? NAV_TABS.find(({ uuid }) => uuid === defaultTabUUID?.uuid)
    : NAV_TABS[0],
  );

  const [selectedTemplate, setSelectedTemplate] = useState<CustomTemplateType>(null);

  const {
    data: dataCustomTemplates,
    mutate: fetchCustomTemplates,
  } = api.custom_templates.list({
    object_type: OBJECT_TYPE_BLOCKS,
  }, {}, {
    pauseFetch: NAV_TAB_BLOCKS.uuid !== selectedTab?.uuid,
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

  const {
    data: dataCustomPipelineTemplates,
    mutate: fetchCustomPipelineTemplates,
  } = api.custom_templates.list({
    object_type: OBJECT_TYPE_PIPELINES,
  }, {}, {
    pauseFetch: NAV_TAB_PIPELINES.uuid !== selectedTab?.uuid,
  });
  const customPipelineTemplates: CustomTemplateType[] = useMemo(() => {
    const arr = dataCustomPipelineTemplates?.custom_templates || [];

    if (selectedLink?.filterTemplates) {
      return selectedLink?.filterTemplates(arr);
    }

    return arr;
  }, [
    dataCustomPipelineTemplates,
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

  const cardsBlocks = useMemo(() => customTemplates?.map((customTemplate: CustomTemplateType) => {
    const {
      description,
      name,
      // tags,
      template_uuid: templateUUID,
    } = customTemplate;

    return (
      <CardStyle
        key={templateUUID}
        onClick={() => {
          if (onClickCustomTemplate) {
            onClickCustomTemplate(customTemplate);
          } else {
            router.push(
              '/templates/[...slug]',
              `/templates/${encodeURIComponent(templateUUID)}`,
            );
          }
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
    );
  }), [
    customTemplates,
    onClickCustomTemplate,
    router,
  ]);

  const breadcrumbsEl = useMemo(() => {
    if (!showBreadcrumbs) {
      return null;
    }

    const breadcrumbs: BreadcrumbType[] = [];

    if (addingNewTemplate) {
      breadcrumbs.push(...[
        {
          label: () => 'Templates',
          onClick: () => {
            setAddingNewTemplate(false);
          },
        },
        {
          bold: true,
          label: () => 'New custom template',
        },
      ]);
    } else {
      breadcrumbs.push({
        label: () => 'Templates',
      });
    }

    return (
      <BreadcrumbsStyle>
        <Breadcrumbs
          breadcrumbs={breadcrumbs}
        />
      </BreadcrumbsStyle>
    );
  }, [
    addingNewTemplate,
    showBreadcrumbs,
  ]);

  // 36 is the height of breadcrumbs
  const heightOffset = useMemo(() => showBreadcrumbs ? 36 : 0, [showBreadcrumbs]);
  const heightFinal = useMemo(() => height - heightOffset, [
    height,
    heightOffset,
  ]);

  if (addingNewTemplate) {
    let detailEl;

    if (OBJECT_TYPE_PIPELINES === objectType && pipelineUUID) {
      detailEl = (
        <PipelineTemplateDetail
          onMutateSuccess={fetchCustomPipelineTemplates}
          pipelineUUID={pipelineUUID}
          templateAttributes={selectedLink && selectedLink?.uuid !== NAV_LINKS?.[0].uuid
            ? {
              pipeline_type: selectedLink?.uuid as PipelineTypeEnum,
            }
            : null
          }
          templateUUID={selectedTemplate?.template_uuid}
        />
      );
    } else {
      detailEl = (
        <TemplateDetail
          contained={contained}
          heightOffset={heightOffset}
          onCreateCustomTemplate={contained
            ? (customTemplate: CustomTemplateType) => {
              setSelectedTemplate(customTemplate);
            }
            : null
          }
          onMutateSuccess={fetchCustomTemplates}
          templateAttributes={selectedLink && selectedLink?.uuid !== NAV_LINKS?.[0].uuid
            ? { block_type: selectedLink?.uuid as BlockTypeEnum }
            : null
          }
          templateUUID={selectedTemplate?.template_uuid}
        />
      );
    }

    if (contained) {
      return (
        <>
          {showBreadcrumbs && breadcrumbsEl}

          <ContainedStyle
            height={heightFinal}
            width={width}
          >
            {detailEl}
          </ContainedStyle>
        </>
      );
    }

    return detailEl;
  }

  const mainEl = (
    <ContainerStyle>
      <NavigationStyle height={contained ? heightFinal : null}>
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

        <LinksContainerStyle
          contained={contained}
          heightOffset={heightOffset}
        >
          {NAV_TAB_BLOCKS.uuid === selectedTab?.uuid && linksBlocks}
        </LinksContainerStyle>
      </NavigationStyle>

      <ContentStyle>
        <SubheaderStyle>
          {NAV_TAB_BLOCKS.uuid === selectedTab?.uuid && (
            <Button
              beforeIcon={<Add size={ICON_SIZE} />}
              onClick={() => {
                setAddingNewTemplate(true);
              }}
              primary
            >
              New block template
            </Button>
          )}
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

  if (contained) {
    return (
      <>
        {showBreadcrumbs && breadcrumbsEl}

        <ContainedStyle
          height={heightFinal}
          width={width}
        >
          {mainEl}
        </ContainedStyle>
      </>
    );
  }

  return mainEl;
}

export default BrowseTemplates;
