import NextLink from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import { useMutation } from 'react-query';
import { useRouter } from 'next/router';

import Button from '@oracle/elements/Button';
import ButtonTabs, { TabType } from '@oracle/components/Tabs/ButtonTabs';
import CustomTemplateType, { OBJECT_TYPE_PIPELINES } from '@interfaces/CustomTemplateType';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Link from '@oracle/elements/Link';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import TextArea from '@oracle/elements/Inputs/TextArea';
import TextInput from '@oracle/elements/Inputs/TextInput';
import TripleLayout from '@components/TripleLayout';
import api from '@api';
import {
  NAV_TABS,
  NAV_TAB_BLOCKS,
  NAV_TAB_DOCUMENT,
  NAV_TAB_TRIGGERS,
} from './constants';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';
import { PipelineTypeEnum } from '@interfaces/PipelineType';
import {
  ButtonsStyle,
  TabsStyle,
} from '@components/CustomTemplates/TemplateDetail/index.style';
import { VERTICAL_NAVIGATION_WIDTH } from '@components/Dashboard/index.style';
import { onSuccess } from '@api/utils/response';
import { useError } from '@context/Error';

type PipelineTemplateDetailProps = {
  defaultTabUUID?: TabType;
  onMutateSuccess?: () => void;
  pipelineUUID?: string;
  template?: CustomTemplateType;
  templateAttributes?: {
    pipeline_type?: PipelineTypeEnum;
  };
  templateUUID?: string;
};

function PipelineTemplateDetail({
  defaultTabUUID,
  pipelineUUID,
  template: templateProp,
  templateAttributes: templateAttributesProp,
  templateUUID,
}: PipelineTemplateDetailProps) {
  const router = useRouter();
  const [showError] = useError(null, {}, [], {
    uuid: 'CustomTemplates/PipelineTemplateDetail',
  });

  const [selectedTab, setSelectedTab] = useState<TabType>(defaultTabUUID
    ? NAV_TABS.find(({ uuid }) => uuid === defaultTabUUID?.uuid)
    : NAV_TABS[0],
  );
  const [touched, setTouched] = useState<boolean>(false);
  const [templateAttributes, setTemplateAttributesState] =
    useState<CustomTemplateType | {}>(templateAttributesProp);
  const setTemplateAttributes = useCallback((handlePrevious) => {
    setTouched(true);
    setTemplateAttributesState(handlePrevious);
  }, []);

  const isNewCustomTemplate: boolean = useMemo(() => !templateProp && !templateUUID, [
    templateProp,
    templateUUID,
  ]);
  const buttonDisabled = useMemo(() => {
    if (isNewCustomTemplate) {
      return !templateAttributes?.name;
    }

    return !touched;
  }, [
    isNewCustomTemplate,
    templateAttributes,
    touched,
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

            router.push(
              '/templates/[...slug]',
              `/templates/${encodeURIComponent(ct?.template_uuid)}?object_type=${OBJECT_TYPE_PIPELINES}`,
            );
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
    api.custom_templates.useUpdate(templateProp
        ? encodeURIComponent(templateProp?.template_uuid)
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

            setTemplateAttributesState(ct);
            setTouched(false);
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

  const after = useMemo(() => {
    return (
      <>
      </>
    );
  }, []);

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
          tabs={isNewCustomTemplate ? NAV_TABS.slice(0, 1) : NAV_TABS}
        />
      </TabsStyle>

      <Flex
        // flex={1}
        flexDirection="column"
      >
        {NAV_TAB_DOCUMENT.uuid === selectedTab?.uuid && (
          <>
            {pipelineUUID && (
              <Spacing mt={PADDING_UNITS} px={PADDING_UNITS}>
                <Text>
                  This custom pipeline template will be based off the pipeline <NextLink
                    as={`/pipelines/${pipelineUUID}`}
                    href={'/pipelines/[pipeline]'}
                    passHref
                  >
                    <Link
                      bold
                      inline
                      monospace
                      openNewWindow
                      sameColorAsText
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
    selectedTab?.uuid,
    setTemplateAttributes,
    templateAttributes?.description,
    templateAttributes?.name,
  ]);

  return (
    <TripleLayout
      after={after}
      before={before}
      beforeHidden={beforeHidden}
      beforeWidth={beforeWidth}
      leftOffset={VERTICAL_NAVIGATION_WIDTH}
      setBeforeHidden={setBeforeHidden}
      setBeforeWidth={setBeforeWidth}
    >
      <h1>Hello</h1>
    </TripleLayout>
  );
}

export default PipelineTemplateDetail;
