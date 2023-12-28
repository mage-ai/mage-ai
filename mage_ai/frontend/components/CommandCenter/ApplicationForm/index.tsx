import { createRef, useEffect, useMemo, useRef, useState } from 'react';

import * as AllIcons from '@oracle/icons';
import FlexContainer from '@oracle/components/FlexContainer';
import SetupSection, { SetupSectionRow } from '@components/shared/SetupSection';
import Text from '@oracle/elements/Text';
import TextInput from '@oracle/elements/Inputs/TextInput';
import { ApplicationProps } from '../ItemApplication/constants';
import {
  ButtonActionTypeEnum,
  CommandCenterItemType,
  FormInputType,
} from '@interfaces/CommandCenterType';
import { CUSTOM_EVENT_NAME_COMMAND_CENTER } from '@utils/events/constants';
import { InteractionInputTypeEnum } from '@interfaces/InteractionType';
import { dig, setNested } from '@utils/hash';

function buildKey({ action_uuid: actionUUID, name }: FormInputType): string {
  return [actionUUID, name].join('.');
}

function nothingFocused(refInputs) {
  if (typeof document === 'undefined' || !refInputs?.current) {
    return false;
  }

  return Object.values(
    refInputs?.current || {},
  )?.every(ref => document.activeElement !== ref?.current);
}

function ApplicationForm({
  executeAction,
  focusedItemIndex,
  item,
}: ApplicationProps) {
  const refInputs = useRef({});

  const settings = item?.application?.settings || [];

  const [attributes, setAttributes] = useState<GlobalHookType>(null);
  const [attributesTouched, setAttributesTouched] = useState<{
    [key: string]: boolean;
  }>(null);

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

  useEffect(() => {
    const handleAction = ({
      detail: {
        actionType,
        item: itemEvent,
      },
    }) => {
      if (itemEvent?.uuid !== item?.uuid) {
        if (ButtonActionTypeEnum.RESET_FORM === actionType) {
          setAttributes(null);
          setAttributesTouched(null);
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
  }, [item]);

  const formMemo = useMemo(() => settings?.map((formInput, idx) => {
    const {
      description,
      icon_uuid: iconUUID,
      label,
      monospace,
      placeholder,
      required,
      type,
    } = formInput;

    const key = buildKey(formInput);
    const ref = refInputs?.current?.[key] || createRef();
    refInputs.current[key] = ref;

    let icon = null;
    if (iconUUID && iconUUID in AllIcons) {
      const Icon = AllIcons?.[iconUUID];
      icon = <Icon />;
    }

    // @ts-ignore
    const rowProps = {
      textInput: null,
    };

    if (InteractionInputTypeEnum.TEXT_FIELD === type) {
      rowProps.textInput = {
        ...(icon ? { afterIcon: icon } : {}),
        monospace,
        onChange: (e) => {
          setAttributesTouched((prev) => {
            const data = { ...prev };
            setNested(data, key, true);
            return data;
          });

          return setAttributes((prev) => {
            const data = { ...prev };
            setNested(data, key, e.target.value);
            return data;
          });
        },
        placeholder,
        ref,
        tabIndex: idx + 1,
        value: dig(attributes || {}, key) || '',
      };
    }

    return (
      <SetupSectionRow
        {...rowProps}
        description={description}
        key={key}
        invalid={required
          && dig(attributesTouched || {}, key)
          && !dig(attributes || {}, key)
        }
        title={label}
      />
    );
  }), [
    attributes,
    attributesTouched,
    settings,
  ]);

  return (
    <>
      {formMemo}
    </>
  );
}

export default ApplicationForm;
