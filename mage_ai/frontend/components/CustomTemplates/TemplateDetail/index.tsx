import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useMutation } from 'react-query';
import { useRouter } from 'next/router';

import Button from '@oracle/elements/Button';
import ButtonTabs, { TabType } from '@oracle/components/Tabs/ButtonTabs';
import CustomTemplateType, { OBJECT_TYPE_BLOCKS } from '@interfaces/CustomTemplateType';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Spacing from '@oracle/elements/Spacing';
import Select from '@oracle/elements/Inputs/Select';
import Text from '@oracle/elements/Text';
import TextInput from '@oracle/elements/Inputs/TextInput';
import api from '@api';
import usePrevious from '@utils/usePrevious';
import {
  BLOCK_TYPE_NAME_MAPPING,
  BlockLanguageEnum,
  BlockTypeEnum,
  LANGUAGE_DISPLAY_MAPPING,
} from '@interfaces/BlockType';
import {
  ButtonsStyle,
  ContainerStyle,
  NavigationStyle,
  TabsStyle,
} from './index.style';
import {
  NAV_TABS,
  NAV_TAB_DEFINE,
  NAV_TAB_DOCUMENT,
} from './constants';
import { PADDING_UNITS, UNITS_BETWEEN_ITEMS_IN_SECTIONS } from '@oracle/styles/units/spacing';
import { onSuccess } from '@api/utils/response';
import { useError } from '@context/Error';

type TemplateDetailProps = {
  defaultTabUUID?: TabType;
  template?: CustomTemplateType;
};

function TemplateDetail({
  defaultTabUUID,
  template,
}: TemplateDetailProps) {
  const router = useRouter();
  const [showError] = useError(null, {}, [], {
    uuid: 'CustomTemplates/TemplateDetail',
  });

  const [selectedTab, setSelectedTab] = useState<TabType>(defaultTabUUID
    ? NAV_TABS.find(({ uuid }) => uuid === defaultTabUUID)
    : NAV_TABS[0],
  );
  const [touched, setTouched] = useState<boolean>(false);
  const [templateAttributes, setTemplateAttributesState] = useState<CustomTemplateType>(null);
  const setTemplateAttributes = useCallback((handlePrevious) => {
    setTouched(true);
    setTemplateAttributesState(handlePrevious);
  }, []);

  const templatePrev = usePrevious(template);
  useEffect(() => {
    if (templatePrev?.uuid !== template?.uuid) {
      setTemplateAttributesState(template);
    }
  }, [template, templatePrev]);

  const [createCustomTemplate, { isLoading: isLoadingCreateCustomTemplate }] = useMutation(
    api.custom_templates.useCreate(),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: ({
            custom_template: ct,
          }) => {
            router.push(
              '/templates/[...slug]',
              `/templates/${encodeURIComponent(ct?.template_uuid)}`,
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

  const isNewCustomTemplate: boolean = !template?.uuid;
  const buttonDisabled = useMemo(() => {
    if (isNewCustomTemplate) {
      return !templateAttributes?.template_uuid
        || !templateAttributes?.block_type
        || !templateAttributes?.language;
    }

    return !touched;
  }, [
    isNewCustomTemplate,
    templateAttributes,
    touched,
  ]);

  return (
    <ContainerStyle>
      <NavigationStyle>
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
            {NAV_TAB_DEFINE.uuid === selectedTab?.uuid && (
              <>
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
                    primary
                    setContentOnMount
                    value={templateAttributes?.template_uuid || ''}
                  />
                </Spacing>

                <Spacing mt={PADDING_UNITS} px={PADDING_UNITS}>
                  <Select
                    label="Block type"
                    // @ts-ignore
                    onChange={e => setTemplateAttributes(prev => ({
                      ...prev,
                      block_type: e.target.value,
                    }))}
                    primary
                    value={templateAttributes?.block_type || ''}
                  >
                    {Object.values(BlockTypeEnum).map((v: string) => (
                      <option key={v} value={v}>
                        {BLOCK_TYPE_NAME_MAPPING[v]}
                      </option>
                    ))}
                  </Select>
                </Spacing>

                <Spacing mt={PADDING_UNITS} px={PADDING_UNITS}>
                  <Select
                    label="Language"
                    // @ts-ignore
                    onChange={e => setTemplateAttributes(prev => ({
                      ...prev,
                      language: e.target.value,
                    }))}
                    primary
                    value={templateAttributes?.language || ''}
                  >
                    {Object.values(BlockLanguageEnum).map((v: string) => (
                      <option key={v} value={v}>
                        {LANGUAGE_DISPLAY_MAPPING[v]}
                      </option>
                    ))}
                  </Select>
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
                  loading={isLoadingCreateCustomTemplate}
                  onClick={() => createCustomTemplate({
                    custom_template: {
                      ...templateAttributes,
                      object_type: OBJECT_TYPE_BLOCKS,
                    },
                  })}
                  primary
                >
                  {!isNewCustomTemplate && 'Save template'}
                  {isNewCustomTemplate && 'Create new template'}
                </Button>

                <Spacing mr={1} />

                <Button
                  secondary
                >
                  Cancel
                </Button>
              </FlexContainer>
            </Spacing>
          </ButtonsStyle>
        </FlexContainer>
      </NavigationStyle>
    </ContainerStyle>
  );
}

export default TemplateDetail;
