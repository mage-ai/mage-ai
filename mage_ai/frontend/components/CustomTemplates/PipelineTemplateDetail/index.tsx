import NextLink from 'next/link';
import { toast } from 'react-toastify';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation } from 'react-query';
import { useRouter } from 'next/router';

import Button from '@oracle/elements/Button';
import ButtonTabs, { TabType } from '@oracle/components/Tabs/ButtonTabs';
import CustomTemplateType, { OBJECT_TYPE_PIPELINES } from '@interfaces/CustomTemplateType';
import DependencyGraph from '@components/DependencyGraph';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Link from '@oracle/elements/Link';
import PipelineType, { PipelineTypeEnum } from '@interfaces/PipelineType';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import TextArea from '@oracle/elements/Inputs/TextArea';
import TextInput from '@oracle/elements/Inputs/TextInput';
import TripleLayout from '@components/TripleLayout';
import api from '@api';
import useConfirmLeave from '@utils/hooks/useConfirmLeave';
import usePrevious from '@utils/usePrevious';
import { HEADER_HEIGHT } from '@components/shared/Header/index.style';
import {
  NAV_TABS,
  NAV_TAB_DEFINE,
  NAV_TAB_BLOCKS,
  NAV_TAB_DOCUMENT,
  NAV_TAB_TRIGGERS,
} from './constants';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';
import {
  ButtonsStyle,
  TabsStyle,
} from '@components/CustomTemplates/TemplateDetail/index.style';
import { VERTICAL_NAVIGATION_WIDTH } from '@components/Dashboard/index.style';
import { onSuccess } from '@api/utils/response';
import { useError } from '@context/Error';
import { useWindowSize } from '@utils/sizes';

type PipelineTemplateDetailProps = {
  defaultTab?: TabType;
  onMutateSuccess?: () => void;
  pipelineUUID?: string;
  template?: CustomTemplateType;
  templateAttributes?: {
    description?: string;
    name?: string;
    pipeline_type?: PipelineTypeEnum;
    template_uuid?: string;
  };
  templateUUID?: string;
};

function PipelineTemplateDetail({
  defaultTab,
  onMutateSuccess,
  pipelineUUID,
  template,
  templateAttributes: templateAttributesProp,
  templateUUID,
}: PipelineTemplateDetailProps) {
  const {
    height: heightWindow,
  } = useWindowSize();
  const heightOffset = HEADER_HEIGHT;

  const router = useRouter();
  const [showError] = useError(null, {}, [], {
    uuid: 'CustomTemplates/PipelineTemplateDetail',
  });

  const [isRedirecting, setIsRedirecting] = useState<boolean>(false);
  const [touched, setTouched] = useState<boolean>(false);
  const [templateAttributes, setTemplateAttributesState] =
    useState<CustomTemplateType | {
      description?: string;
      name?: string;
      template_uuid?: string;
    }>(templateAttributesProp);
  const setTemplateAttributes = useCallback((handlePrevious) => {
    setTouched(true);
    setTemplateAttributesState(handlePrevious);
  }, []);

  const templatePrev = usePrevious(template);
  useEffect(() => {
    if (templatePrev?.template_uuid !== template?.template_uuid) {
      setTemplateAttributesState(template);
    }
  }, [template, templatePrev]);

  const { data: dataPipeline } = api.pipelines.detail(pipelineUUID);
  const pipeline = useMemo(() => template?.pipeline || dataPipeline?.pipeline, [
    dataPipeline,
    template,
  ]);
  const blocks = useMemo(() => pipeline?.blocks || [], [pipeline]);

  const isNewCustomTemplate: boolean = useMemo(() => !template && !templateUUID, [
    template,
    templateUUID,
  ]);

  const [selectedTab, setSelectedTab] = useState<TabType>(defaultTab
    ? NAV_TABS.find(({ uuid }) => uuid === defaultTab?.uuid)
    : NAV_TABS[0],
  );

  const buttonDisabled = useMemo(() => {
    if (isNewCustomTemplate) {
      return !templateAttributes?.template_uuid;
    }

    return false;
  }, [
    isNewCustomTemplate,
    templateAttributes,
  ]);

  const [beforeHidden, setBeforeHidden] = useState<boolean>(false);
  const [beforeWidth, setBeforeWidth] = useState<number>(isNewCustomTemplate ? 400 : 300);

  const [createCustomTemplate, { isLoading: isLoadingCreateCustomTemplate }] = useMutation(
    api.custom_templates.useCreate(),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: ({
            custom_template: ct,
          }) => {
            if (onMutateSuccess) {
              onMutateSuccess?.();
            }

            setIsRedirecting(true);
            setTimeout(() => {
              router.push(
                '/templates/[...slug]',
                `/templates/${encodeURIComponent(ct?.template_uuid)}?object_type=${OBJECT_TYPE_PIPELINES}`,
              );
            }, 1);
          },
          onErrorCallback: (response, errors) => showError({
            errors,
            response,
          }),
        },
      ),
    },
  );

  const [updateCustomTemplate, { isLoading: isLoadingUpdateCustomTemplate }] = useMutation(
    api.custom_templates.useUpdate(template
        ? encodeURIComponent(template?.template_uuid)
        : templateUUID && encodeURIComponent(templateUUID),
      {
        object_type: OBJECT_TYPE_PIPELINES,
      },
    ),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: ({
            custom_template: ct,
          }) => {
            if (onMutateSuccess) {
              onMutateSuccess?.();
            }

            if (
              (template?.template_uuid && ct?.template_uuid !== template?.template_uuid)
                || (templateUUID && ct?.template_uuid !== templateUUID)
            ) {
              router.replace(
                '/templates/[...slug]',
                `/templates/${encodeURIComponent(ct?.template_uuid)}?object_type=${OBJECT_TYPE_PIPELINES}`,
              );
            } else {
              setTemplateAttributesState(ct);
              setTouched(false);

              toast.success(
                'Template successfully saved.',
                {
                  position: toast.POSITION.BOTTOM_RIGHT,
                  toastId: 'custom_pipeline_template',
                },
              );
            }
          },
          onErrorCallback: (response, errors) => showError({
            errors,
            response,
          }),
        },
      ),
    },
  );

  const saveCustomTemplate = useCallback(() => {
    const payload = {
      custom_template: {
        ...templateAttributes,
        object_type: OBJECT_TYPE_PIPELINES,
      },
    };

    if (isNewCustomTemplate) {
      // @ts-ignore
      createCustomTemplate({
        ...payload,
        custom_template: {
          ...payload?.custom_template,
          pipeline_uuid: pipelineUUID,
        },
      });
    } else {
      // @ts-ignore
      updateCustomTemplate(payload);
    }
  }, [
    createCustomTemplate,
    isNewCustomTemplate,
    pipelineUUID,
    templateAttributes,
    updateCustomTemplate,
  ]);

  const before = useMemo(() => (
    <FlexContainer
      flexDirection="column"
      fullHeight
    >
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

      <Flex
        // flex={1}
        flexDirection="column"
      >
        {NAV_TAB_DEFINE.uuid === selectedTab?.uuid && (
          <>
            {pipelineUUID && (
              <Spacing mt={PADDING_UNITS} px={PADDING_UNITS}>
                <Text default>
                  This pipeline template will be based off the pipeline <NextLink
                    as={`/pipelines/${pipelineUUID}`}
                    href={'/pipelines/[pipeline]'}
                    passHref
                  >
                    <Link
                      bold
                      default
                      inline
                      monospace
                      openNewWindow
                    >
                      {pipelineUUID}
                    </Link>
                  </NextLink>.
                </Text>
              </Spacing>
            )}

            <Spacing mt={PADDING_UNITS} px={PADDING_UNITS}>
              <Spacing mb={1}>
                <Text bold>
                  Template UUID
                </Text>
                <Text muted small>
                  Unique identifier for custom template.
                  The UUID will also determine where the custom template file is stored in the
                  project.
                  You can use nested folder names in the template’s UUID.
                </Text>
              </Spacing>

              <TextInput
                monospace
                // @ts-ignore
                onChange={e => setTemplateAttributes(prev => ({
                  ...prev,
                  template_uuid: e.target.value,
                }))}
                placeholder="e.g. some_template_name"
                primary
                setContentOnMount
                value={templateAttributes?.template_uuid || ''}
              />
            </Spacing>
          </>
        )}

        {NAV_TAB_DOCUMENT.uuid === selectedTab?.uuid && (
          <>
            <Spacing mt={PADDING_UNITS} px={PADDING_UNITS}>
              <Spacing mb={1}>
                <Text bold>
                  Name
                </Text>
                <Text muted small>
                  A human readable name for your template.
                </Text>
              </Spacing>

              <TextInput
                // @ts-ignore
                onChange={e => setTemplateAttributes(prev => ({
                  ...prev,
                  name: e.target.value,
                }))}
                primary
                setContentOnMount
                value={templateAttributes?.name || ''}
              />
            </Spacing>

            <Spacing mt={PADDING_UNITS} px={PADDING_UNITS}>
              <TextArea
                label="Description"
                // @ts-ignore
                onChange={e => setTemplateAttributes(prev => ({
                  ...prev,
                  description: e.target.value,
                }))}
                primary
                setContentOnMount
                value={templateAttributes?.description || ''}
              />
            </Spacing>
          </>
        )}
      </Flex>

      <ButtonsStyle>
        <Spacing p={PADDING_UNITS}>
          <FlexContainer>
            <Button
              disabled={buttonDisabled}
              fullWidth
              loading={isLoadingCreateCustomTemplate || isLoadingUpdateCustomTemplate}
              onClick={() => saveCustomTemplate()}
              primary
            >
              {!isNewCustomTemplate && 'Save template'}
              {isNewCustomTemplate && 'Create new template'}
            </Button>
          </FlexContainer>
        </Spacing>
      </ButtonsStyle>
    </FlexContainer>
  ), [
    buttonDisabled,
    isLoadingCreateCustomTemplate,
    isLoadingUpdateCustomTemplate,
    isNewCustomTemplate,
    pipelineUUID,
    saveCustomTemplate,
    selectedTab?.uuid,
    setTemplateAttributes,
    templateAttributes,
  ]);

  const { ConfirmLeaveModal } = useConfirmLeave({
    shouldWarn: !isRedirecting && touched,
    warningMessage: 'You have unsaved changes. Are you sure you want to leave?',
  });

  return (
    // @ts-ignore
    <TripleLayout
      before={before}
      beforeHidden={beforeHidden}
      beforeWidth={beforeWidth}
      leftOffset={VERTICAL_NAVIGATION_WIDTH}
      setBeforeHidden={setBeforeHidden}
      setBeforeWidth={setBeforeWidth}
    >
      <ConfirmLeaveModal />
      <DependencyGraph
        blocks={blocks}
        height={heightWindow}
        heightOffset={HEADER_HEIGHT}
        noStatus
        pipeline={pipeline as PipelineType}
      />
    </TripleLayout>
  );
}

export default PipelineTemplateDetail;
