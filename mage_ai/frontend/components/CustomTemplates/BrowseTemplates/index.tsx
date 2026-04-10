import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { MutateFunction, useMutation } from 'react-query';
import { ThemeContext } from 'styled-components';
import { useRouter } from 'next/router';

import BlockNavigation from './Navigation/BlockNavigation';
import Breadcrumbs, { BreadcrumbType } from '@components/Breadcrumbs';
import Button from '@oracle/elements/Button';
import ButtonTabs, { TabType } from '@oracle/components/Tabs/ButtonTabs';
import ConfigurePipeline from '@components/PipelineDetail/ConfigurePipeline';
import CustomTemplateType, {
  OBJECT_TYPE_BLOCKS,
  OBJECT_TYPE_PIPELINES,
} from '@interfaces/CustomTemplateType';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import PipelineTemplateDetail from '@components/CustomTemplates/PipelineTemplateDetail';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import TagsContainer from '@components/Tags/TagsContainer';
import TemplateDetail from '@components/CustomTemplates/TemplateDetail';
import Text from '@oracle/elements/Text';
import TextArea from '@oracle/elements/Inputs/TextArea';
import TextInput from '@oracle/elements/Inputs/TextInput';
import api from '@api';
import {
  Add,
  BlocksStacked,
  Edit,
  Trash,
  VisibleEye,
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
  TagsStyle,
} from './index.style';
import {
  ContainerStyle as ModalContainerStyle,
  FooterStyle as ModalFooterStyle,
  HeaderStyle as ModalHeaderStyle,
  RowStyle as ModalRowStyle,
} from '@components/PipelineDetail/ConfigureBlock/index.style';
import {
  NAV_LINKS,
  NAV_LINKS_PIPELINES,
  NAV_TABS,
  NAV_TAB_BLOCKS,
  NAV_TAB_PIPELINES,
  NavLinkType,
} from './constants';
import { PipelineTypeEnum } from '@interfaces/PipelineType';
import { UNIT } from '@oracle/styles/units/spacing';
import { goToWithQuery } from '@utils/routing';
import { onSuccess } from '@api/utils/response';
import { randomNameGenerator } from '@utils/string';
import { useModal } from '@context/Modal';
import { useWindowSize } from '@utils/sizes';

type EditTemplateFormProps = {
  customTemplate: CustomTemplateType;
  onHide: () => void;
  onSave: (name: string, description: string) => void;
};

function EditTemplateForm({ customTemplate, onHide, onSave }: EditTemplateFormProps) {
  const [name, setName] = useState(customTemplate?.name || customTemplate?.template_uuid || '');
  const [description, setDescription] = useState(customTemplate?.description || '');

  return (
    <ModalContainerStyle width={55 * UNIT}>
      <ModalHeaderStyle lightBackground>
        <Text bold cyan largeLg>
          Edit Template
        </Text>
      </ModalHeaderStyle>

      <ModalRowStyle lightBackground>
        <Text default>
          Name
        </Text>
        <TextInput
          alignRight
          fullWidth
          noBackground
          noBorder
          onChange={e => setName(e.target.value)}
          paddingVertical={UNIT}
          placeholder="Template name..."
          value={name}
        />
      </ModalRowStyle>

      <ModalRowStyle lightBackground>
        <Text default>
          Description
        </Text>
        <Spacing ml={9} />
        <Spacing fullWidth px={2} py={1}>
          <TextArea
            onChange={e => setDescription(e.target.value)}
            rows={3}
            value={description}
          />
        </Spacing>
      </ModalRowStyle>

      <ModalFooterStyle topBorder>
        <FlexContainer fullWidth>
          <Flex flex="1">
            <Button fullWidth onClick={onHide}>
              Cancel
            </Button>
          </Flex>

          <Spacing ml={1} />

          <Flex flex="1">
            <KeyboardShortcutButton
              bold
              centerText
              disabled={!name}
              fullWidth
              onClick={() => onSave(name, description)}
              primary
              uuid="EditTemplateForm/Save"
            >
              Save
            </KeyboardShortcutButton>
          </Flex>
        </FlexContainer>
      </ModalFooterStyle>
    </ModalContainerStyle>
  );
}

type ContextMenuItem = {
  label: string;
  icon?: any;
  onClick: () => void;
};

type ContextMenuState = {
  x: number;
  y: number;
  items: ContextMenuItem[];
} | null;

type BrowseTemplatesProps = {
  contained?: boolean;
  defaultLinkUUID?: string;
  defaultTab?: TabType;
  objectType?: string;
  onClickCustomTemplate?: (customTemplate: CustomTemplateType) => void;
  pipelineUUID?: string;
  showAddingNewTemplates?: boolean;
  showBreadcrumbs?: boolean;
  tabs?: TabType[];
};

function BrowseTemplates({
  contained,
  defaultLinkUUID,
  defaultTab,
  objectType,
  onClickCustomTemplate,
  pipelineUUID,
  showAddingNewTemplates,
  showBreadcrumbs,
  tabs: tabsProp,
}: BrowseTemplatesProps) {
  const router = useRouter();
  const themeContext = useContext(ThemeContext);
  const { height, width } = useWindowSize();

  const tabs = useMemo(() => tabsProp || NAV_TABS, [tabsProp]);

  const [addingNewTemplate, setAddingNewTemplate] =
    useState<boolean>(showAddingNewTemplates || false);
  const [selectedLink, setSelectedLink] = useState<NavLinkType>(defaultLinkUUID
    ? NAV_LINKS.find(({ uuid }) => uuid === defaultLinkUUID)
    : NAV_LINKS[0],
  );
  const [selectedTab, setSelectedTab] = useState<TabType>(defaultTab
    ? tabs.find(({ uuid }) => uuid === defaultTab?.uuid)
    : tabs[0],
  );

  const [selectedTemplate, setSelectedTemplate] = useState<CustomTemplateType>(null);

  // Mutations
  const [createPipeline]: [MutateFunction<any>, any] = useMutation(
    api.pipelines.useCreate(),
    {
      onSuccess: (response: any) => onSuccess(response, {
        callback: ({ pipeline: { uuid } }) => {
          router.push('/pipelines/[pipeline]/edit', `/pipelines/${uuid}/edit`);
        },
      }),
    },
  );

  const hideEditModalRef = useRef<() => void>(null);

  const [updateTemplate]: [MutateFunction<any>, any] = useMutation(
    ({ templateUUID, objType, payload }: {
      templateUUID: string;
      objType: string;
      payload: any;
    }) => api.custom_templates.useUpdate(templateUUID, { object_type: objType })({
      custom_template: payload,
    }),
    {
      onSuccess: (response: any) => onSuccess(response, {
        callback: () => {
          fetchCustomTemplates?.();
          fetchCustomPipelineTemplates?.();
          hideEditModalRef.current?.();
        },
      }),
    },
  );

  const [deleteTemplate]: [MutateFunction<any>, any] = useMutation(
    ({ templateUUID, objType }: { templateUUID: string; objType: string }) =>
      api.custom_templates.useDelete(templateUUID, { object_type: objType })(),
    {
      onSuccess: (response: any) => onSuccess(response, {
        callback: () => {
          fetchCustomTemplates?.();
          fetchCustomPipelineTemplates?.();
        },
      }),
    },
  );

  const [showCreateFromTemplateModal, hideCreateFromTemplateModal] = useModal(({
    customTemplate: tpl,
  }: {
    customTemplate: CustomTemplateType;
  }) => (
    <ConfigurePipeline
      onClose={hideCreateFromTemplateModal}
      onSave={({ name, description, tags }) => {
        createPipeline({
          pipeline: {
            custom_template_uuid: tpl?.template_uuid,
            description,
            name: name || randomNameGenerator(),
            tags,
            type: PipelineTypeEnum.PYTHON,
          },
        });
      }}
      pipelineType={PipelineTypeEnum.PYTHON}
    />
  ), {}, [createPipeline], {
    background: true,
    disableEscape: true,
    uuid: 'browse-templates/create-from-template',
  });

  const [showEditModal, hideEditModal] = useModal(({
    customTemplate: tpl,
    objType,
  }: {
    customTemplate: CustomTemplateType;
    objType: string;
  }) => (
    <EditTemplateForm
      customTemplate={tpl}
      onHide={hideEditModal}
      onSave={(name, description) => {
        updateTemplate({
          templateUUID: tpl?.template_uuid,
          objType,
          payload: {
            description,
            name,
            object_type: objType,
            template_uuid: tpl?.template_uuid,
          },
        });
      }}
    />
  ), {}, [updateTemplate], {
    background: true,
    disableEscape: true,
    uuid: 'browse-templates/edit-template',
  });
  hideEditModalRef.current = hideEditModal;

  // Inline context menu state
  const [contextMenuState, setContextMenuState] = useState<ContextMenuState>(null);

  const hideContextMenu = useCallback(() => setContextMenuState(null), []);

  useEffect(() => {
    if (!contextMenuState) return;
    const handleClick = () => setContextMenuState(null);
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [contextMenuState]);

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

  const linksPipelines = useMemo(() => NAV_LINKS_PIPELINES.map((navLink: NavLinkType) => {
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
      tags,
      template_uuid: templateUUID,
      user,
    } = customTemplate;

    const tagsToShow = [];
    if (tags?.length) {
      tagsToShow.push(...tags);
    } else if (user?.username) {
      tagsToShow.push(user?.username);
    }

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
        onContextMenu={(e: any) => {
          e.preventDefault();
          e.stopPropagation();
          setContextMenuState({
            x: e.clientX,
            y: e.clientY,
            items: [
              {
                label: 'View',
                icon: <VisibleEye size={ICON_SIZE} />,
                onClick: () => {
                  hideContextMenu();
                  router.push(
                    '/templates/[...slug]',
                    `/templates/${encodeURIComponent(templateUUID)}`,
                  );
                },
              },
              {
                label: 'Edit',
                icon: <Edit size={ICON_SIZE} />,
                onClick: () => {
                  hideContextMenu();
                  showEditModal({ customTemplate, objType: OBJECT_TYPE_BLOCKS });
                },
              },
              {
                label: 'Delete',
                icon: <Trash size={ICON_SIZE} />,
                onClick: () => {
                  hideContextMenu();
                  if (typeof window !== 'undefined' && window.confirm(
                    `Are you sure you want to delete template "${name || templateUUID}"?`,
                  )) {
                    deleteTemplate({ templateUUID, objType: OBJECT_TYPE_BLOCKS });
                  }
                },
              },
            ],
          });
        }}
      >
        <CardTitleStyle>
          <Text bold monospace textOverflow>
            {name || templateUUID}
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

        <TagsStyle>
          {tagsToShow?.length >= 1 && (
            <TagsContainer
              tags={tagsToShow?.map(uuid => ({ uuid }))}
            />
          )}
        </TagsStyle>
      </CardStyle>
    );
  }), [
    customTemplates,
    deleteTemplate,
    hideContextMenu,
    onClickCustomTemplate,
    router,
    setContextMenuState,
    showEditModal,
  ]);

  const cardsPipelines = useMemo(() => customPipelineTemplates?.map((customTemplate: CustomTemplateType) => {
    const {
      description,
      name,
      tags,
      template_uuid: templateUUID,
      user,
    } = customTemplate;

    const tagsToShow = [];
    if (tags?.length) {
      tagsToShow.push(...tags);
    } else if (user?.username) {
      tagsToShow.push(user?.username);
    }

    return (
      <CardStyle
        key={templateUUID}
        onClick={() => {
          if (onClickCustomTemplate) {
            onClickCustomTemplate(customTemplate);
          } else {
            router.push(
              '/templates/[...slug]',
              `/templates/${encodeURIComponent(templateUUID)}?object_type=${OBJECT_TYPE_PIPELINES}`,
            );
          }
        }}
        onContextMenu={(e: any) => {
          e.preventDefault();
          e.stopPropagation();
          setContextMenuState({
            x: e.clientX,
            y: e.clientY,
            items: [
              {
                label: 'Create pipeline',
                icon: <Add size={ICON_SIZE} />,
                onClick: () => {
                  hideContextMenu();
                  showCreateFromTemplateModal({ customTemplate });
                },
              },
              {
                label: 'View',
                icon: <VisibleEye size={ICON_SIZE} />,
                onClick: () => {
                  hideContextMenu();
                  router.push(
                    '/templates/[...slug]',
                    `/templates/${encodeURIComponent(templateUUID)}?object_type=${OBJECT_TYPE_PIPELINES}`,
                  );
                },
              },
              {
                label: 'Edit',
                icon: <Edit size={ICON_SIZE} />,
                onClick: () => {
                  hideContextMenu();
                  showEditModal({ customTemplate, objType: OBJECT_TYPE_PIPELINES });
                },
              },
              {
                label: 'Delete',
                icon: <Trash size={ICON_SIZE} />,
                onClick: () => {
                  hideContextMenu();
                  if (typeof window !== 'undefined' && window.confirm(
                    `Are you sure you want to delete template "${name || templateUUID}"?`,
                  )) {
                    deleteTemplate({ templateUUID, objType: OBJECT_TYPE_PIPELINES });
                  }
                },
              },
            ],
          });
        }}
      >
        <CardTitleStyle>
          <Text bold monospace textOverflow>
            {name || templateUUID}
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

        <TagsStyle>
          {tagsToShow?.length >= 1 && (
            <TagsContainer
              tags={tagsToShow?.map(uuid => ({ uuid }))}
            />
          )}
        </TagsStyle>
      </CardStyle>
    );
  }), [
    customPipelineTemplates,
    deleteTemplate,
    hideContextMenu,
    onClickCustomTemplate,
    router,
    setContextMenuState,
    showCreateFromTemplateModal,
    showEditModal,
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
              if (contained) {
                setSelectedTab(tab);
              } else {
                goToWithQuery({
                  object_type: NAV_TAB_PIPELINES.uuid === tab.uuid ? OBJECT_TYPE_PIPELINES : OBJECT_TYPE_BLOCKS,
                });
              }
            }}
            selectedTabUUID={selectedTab?.uuid}
            tabs={tabs}
          />
        </TabsStyle>

        <LinksContainerStyle
          contained={contained}
          heightOffset={heightOffset}
        >
          {NAV_TAB_BLOCKS.uuid === selectedTab?.uuid && (
            <BlockNavigation
              navLinks={NAV_LINKS}
              selectedLink={selectedLink}
              setSelectedLink={setSelectedLink}
            />
          )}
          {NAV_TAB_PIPELINES.uuid === selectedTab?.uuid && linksPipelines}
        </LinksContainerStyle>
      </NavigationStyle>

      <ContentStyle>
        {NAV_TAB_BLOCKS.uuid === selectedTab?.uuid && (
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
        )}

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

            {cardsBlocks?.length >= 1 && (
              <CardsStyle>
                {cardsBlocks}
              </CardsStyle>
            )}
          </>
        )}

        {NAV_TAB_PIPELINES.uuid === selectedTab?.uuid && (
          <>
            {!dataCustomPipelineTemplates && (
              <Spacing p={2}>
                <Spinner inverted />
              </Spacing>
            )}

            {dataCustomPipelineTemplates && !cardsPipelines?.length && (
              <Spacing p={2}>
                <Text>
                  There are currently no templates matching your search.
                </Text>

                <br />

                <Text>
                  Add a new template by right-clicking a pipeline row from the
                  Pipelines page and selecting &#34;Create template&#34;.
                </Text>
              </Spacing>
            )}

            {cardsPipelines?.length >= 1 && (
              <CardsStyle>
                {cardsPipelines}
              </CardsStyle>
            )}
          </>
        )}
      </ContentStyle>
    </ContainerStyle>
  );

  const contextMenuEl = (contextMenuState && typeof document !== 'undefined') ? createPortal(
    <div
      onMouseDown={e => e.stopPropagation()}
      style={{
        background: '#1a1a2e',
        border: '1px solid #444',
        borderRadius: 4,
        boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
        left: contextMenuState.x,
        minWidth: 180,
        position: 'fixed',
        top: contextMenuState.y,
        zIndex: 9999,
      }}
    >
      {contextMenuState.items.map((item, idx) => (
        <div
          key={idx}
          onClick={(e) => {
            e.stopPropagation();
            item.onClick();
          }}
          style={{
            alignItems: 'center',
            cursor: 'pointer',
            display: 'flex',
            gap: 8,
            padding: '8px 16px',
          }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#2a2a4e'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
        >
          {item.icon && <span style={{ display: 'flex', opacity: 0.8 }}>{item.icon}</span>}
          <span style={{ color: '#fff', fontSize: 14 }}>{item.label}</span>
        </div>
      ))}
    </div>,
    document.body,
  ) : null;

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

        {contextMenuEl}
      </>
    );
  }

  return (
    <>
      {mainEl}
      {contextMenuEl}
    </>
  );
}

export default BrowseTemplates;
