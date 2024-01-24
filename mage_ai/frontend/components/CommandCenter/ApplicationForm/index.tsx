import { createRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import * as AllIcons from '@oracle/icons';
import CodeEditor from '@components/CodeEditor';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Folder from '@components/FileBrowser/Folder';
import SetupSection, { SetupSectionRow } from '@components/shared/SetupSection';
import Text from '@oracle/elements/Text';
import TextInput from '@oracle/elements/Inputs/TextInput';
import api from '@api';
import useExecuteActions from '../useExecuteActions';
import useInvokeRequest from '../useInvokeRequest';
import { ApplicationContentStyle } from '../index.style';
import { ApplicationProps } from '../ItemApplication/constants';
import {
  ButtonActionTypeEnum,
  CommandCenterItemType,
  FormInputType,
  KeyValueType,
} from '@interfaces/CommandCenterType';
import { CUSTOM_EVENT_NAME_COMMAND_CENTER } from '@utils/events/constants';
import { ChildrenStyle, ContainerStyle, FormStyle } from './index.style';
import { InteractionInputTypeEnum } from '@interfaces/InteractionType';
import { UNIT } from '@oracle/styles/units/spacing';
import { dig, setNested } from '@utils/hash';
import { isJsonString } from '@utils/string';

function buildKey({ action_uuid: actionUUID, name }: FormInputType): string {
  return [actionUUID, name].join('.');
}

function nothingFocused(refInputs) {
  if (typeof document === 'undefined' || !refInputs?.current) {
    return false;
  }

  return Object.values(
    refInputs?.current || {},
  )?.every((ref: { current: any }) => document.activeElement !== ref?.current);
}

function ApplicationForm({
  application,
  applicationState,
  applicationsRef,
  closeCommandCenter,
  executeAction,
  focusedItemIndex,
  item,
  router,
  showError,
}: ApplicationProps) {
  const refInputs = useRef({});

  const {
    configurations,
    settings,
    uuid,
  } = application || {
    configurations: null,
    settings: null,
    uuid: null,
  };
  const {
    interaction_parsers: interactionParsers,
    requests,
  } = configurations || {
    interaction_parsers: null,
    requests: null,
  };

  const [attributes, setAttributesState] = useState<KeyValueType>(null);
  const [attributesTouched, setAttributesTouched] = useState<{
    [key: string]: boolean;
  }>(null);
  const [requestsData, setRequestsData] = useState<KeyValueType>(null);

  const setAttributes = useCallback((prev1) => setAttributesState((prev2) => {
    const val = prev1 ? prev1?.(prev2) : prev1;

    if (!applicationState?.current) {
      applicationState.current = {};
    }

    applicationState.current = {
      ...(applicationState?.current || {}),
      ...val,
    };

    return val;
  }), []);

  const resetFormValues = useCallback(() => {
    let attributesDefault = {};

    settings?.forEach((formInput) => {
      const {
        action_uuid: actionUUID,
        name,
        value,
      } = formInput;

      if (value) {
        attributesDefault[actionUUID] = {
          ...(attributesDefault[actionUUID] || {}),
          [name]: value,
        };
      }
    });

    setAttributes(() => attributesDefault);
    setAttributesTouched(null);
    setRequestsData(null);
  }, [settings]);

  useEffect(() => {
    resetFormValues();
  }, [resetFormValues]);

  useEffect(() => {
    if (!requests) {
      setRequestsData({});
    }
  }, [requests]);

  useEffect(() => {
    if (settings?.length >= 1 && nothingFocused(refInputs)) {
      // Get the 1st input that doesn’t have a value.
      let formInput = settings?.find((formInput) => {
        if (!attributes) {
          return true;
        }

        const key = buildKey(formInput);
        const val = dig(attributes, key);

        return val === undefined || !val?.length;
      });

      if (!formInput) {
        formInput = settings?.[settings?.length - 1];
      }

      if (formInput) {
        const key = buildKey(formInput);
        setTimeout(() => refInputs?.current?.[key]?.current?.focus(), 1);
      }
    }
  }, [settings]);

  useEffect(() => {
    const handleAction = ({
      detail: {
        actionType,
        item: itemEvent,
      },
    }) => {
      if (itemEvent?.uuid === item?.uuid) {
        if (ButtonActionTypeEnum.RESET_FORM === actionType) {
          resetFormValues();
        }
      }
    };

    if (typeof window !== 'undefined') {
      // @ts-ignore
      window.addEventListener(CUSTOM_EVENT_NAME_COMMAND_CENTER, handleAction);
    }

    return () => {
      if (typeof window !== 'undefined') {
        // @ts-ignore
        window.removeEventListener(CUSTOM_EVENT_NAME_COMMAND_CENTER, handleAction);
      }
    };
  }, [item, resetFormValues]);

  let updateAttributes;

  const formMemo = useMemo(() => settings?.map((formInput, idx) => {
    const {
      action_uuid: actionUUID,
      description,
      display_settings: displaySettings,
      label,
      monospace,
      name,
      options,
      placeholder,
      required,
      style,
      text,
      type,
    } = formInput;
    const iconUUID = displaySettings?.icon_uuid;

    const key = buildKey(formInput);
    const ref = refInputs?.current?.[key] || createRef();
    refInputs.current[key] = ref;

    let icon = null;
    if (iconUUID && iconUUID in AllIcons) {
      const Icon = AllIcons?.[iconUUID];
      icon = <Icon />;
    }

    const {
      multiline,
      language,
    } = style || {
      multiline: false,
      language: null,
    };
    let content;

    // @ts-ignore
    const rowProps = {
      selectInput: null,
      textInput: null,
      toggleSwitch: null,
    };

    const inputProps = {
      ...(icon ? { afterIcon: icon } : {}),
      alignRight: !multiline,
      monospace,
      multiline,
      name,
      noBackground: !multiline,
      noBorder: !multiline,
      paddingHorizontal: multiline ? 2 * UNIT : null,
      paddingVertical: multiline ? 2 * UNIT : null,
      onChange: (e) => {
        setAttributesTouched(prev => ({
          ...prev,
          [actionUUID]: {
            // @ts-ignore
            ...(prev?.[actionUUID] || {}),
            [name]: true,
          },
        }));

        return setAttributes(prev => ({
          ...prev,
          [actionUUID]: {
            ...(prev?.[actionUUID] || {}),
            [name]: e.target.value,
          },
        }));
      },
      placeholder,
      ref,
      rows: multiline ? 12 : null,
      tabIndex: idx + 1,
      value: attributes?.[actionUUID]?.[name] || '',
    };
    updateAttributes = inputProps.onChange;

    if (InteractionInputTypeEnum.TEXT_FIELD === type) {
      rowProps.textInput = inputProps;
    } else if (InteractionInputTypeEnum.DROPDOWN_MENU === type) {
      rowProps.selectInput = {
        ...inputProps,
        options,
      };
    } else if (InteractionInputTypeEnum.SWITCH === type) {
      rowProps.toggleSwitch = {
        ...inputProps,
        checked: !!inputProps?.value,
        onCheck: () => inputProps?.onChange({
          target: {
            value: !inputProps?.value,
          },
        }),
      };
    } else if (InteractionInputTypeEnum.CODE === type) {
      content = (
        <CodeEditor
          autoHeight
          containerWidth="100%"
          language={language}
          onChange={value => inputProps.onChange({
            target: {
              value: (isJsonString(value) ? JSON.parse(value) : value).trim(),
            },
          })}
          onMountCallback={(editor) => {
            ref.current = editor;
          }}
          padding={UNIT * 2}
          selected
          tabSize={2}
          textareaFocused
          value={typeof inputProps?.value === 'string'
            ? inputProps?.value
            : JSON.stringify(inputProps?.value, null, 2)
          }
        />
      );
    } else if (!type && text) {
      content = (
        <FlexContainer alignContent="flex-end" flexDirection="column">
          {text?.map(line => (
            <Text
              key={line}
              rightAligned
              {...style}
            >
              {line}
            </Text>
          ))}
        </FlexContainer>
      )
    }

    return (
      <SetupSectionRow
        {...rowProps}
        key={inputProps?.name}
        description={description}
        invalid={required
          && attributesTouched?.[actionUUID]?.[name]
          && !attributes?.[actionUUID]?.[name]
        }
        title={label}
      >
        {content}
      </SetupSectionRow>
    );
  }), [
    attributes,
    attributesTouched,
    settings,
  ]);

  const {
    invokeRequest,
    isLoading: isLoadingRequest,
  } = useInvokeRequest({
    onSuccessCallback: (
      value,
      {
        action: {
          uuid,
        },
        focusedItemIndex,
      },
    ) => {
      setRequestsData({
        [uuid]: value,
      });
    },
    showError,
  });
  const executeActionRequests = useExecuteActions({
    closeCommandCenter,
    fetchItems: null,
    invokeRequest,
    router,
  });

  useEffect(() => {
    if (requests) {
      executeActionRequests(
        item,
        focusedItemIndex,
        Object.entries(requests || {})?.map(([actionUUID, request]) => ({
          request,
          uuid: actionUUID,
        })),
      );
    }
  }, [requests]);

  const childrenMemo = useMemo(() => {
    let inner;

    if (requestsData?.files) {
      inner = (
        <div style={{ paddingBottom: 8, paddingTop: 8 }}>
          {(requestsData?.files as any[])?.map((file, idx) => (
            <Folder
              disableContextMenu
              file={file}
              key={`${file.name}-${idx}`}
              level={0}
              onClickFolder={(fullPath) => {
                const parser = interactionParsers?.['files.click.folder'];
                if (parser) {
                  const {
                    action_uuid: actionUUID,
                    name,
                  } = parser;

                  setAttributesTouched(prev => ({
                    ...prev,
                    [actionUUID]: {
                      // @ts-ignore
                      ...(prev?.[actionUUID] || {}),
                      [name]: true,
                    },
                  }));

                  return setAttributes(prev => ({
                    ...prev,
                    [actionUUID]: {
                      ...(prev?.[actionUUID] || {}),
                      [name]: fullPath,
                    },
                  }));
                }
              }}
              onlyShowFolders
            />
          ))}
        </div>
      );
    }

    if (inner) {
      return (
        <ChildrenStyle>
          {inner}
        </ChildrenStyle>
      );
    }

    return null;
  }, [interactionParsers, requestsData]);

  return (
    <ApplicationContentStyle>
      <ContainerStyle>
        {childrenMemo}

        <FormStyle fullWidth={!childrenMemo}>
          {formMemo}
        </FormStyle>
      </ContainerStyle>
    </ApplicationContentStyle>
  );
}

export default ApplicationForm;
