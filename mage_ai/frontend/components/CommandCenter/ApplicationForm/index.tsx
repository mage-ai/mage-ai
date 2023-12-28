import { createRef, useEffect, useRef, useState } from 'react';

import * as AllIcons from '@oracle/icons';
import FlexContainer from '@oracle/components/FlexContainer';
import SetupSection, { SetupSectionRow } from '@components/shared/SetupSection';
import Text from '@oracle/elements/Text';
import TextInput from '@oracle/elements/Inputs/TextInput';
import { CommandCenterItemType } from '@interfaces/CommandCenterType';
import { InteractionInputTypeEnum } from '@interfaces/InteractionType';

type InteractionFormProps = {
  item: CommandCenterItemType;
};

function buildKey({
  action_uuid: actionUUID,
  name,
}: {
  action_uuid: string;
  name: string;
}): List[str] {
  return [actionUUID, name]?.filter(v => v)?.join(':');
}

function InteractionForm({
  item,
}: InteractionFormProps) {
  const settings = item?.application?.settings || [];

  const refInputs = useRef({});

  const [attributes, setAttributes] = useState<GlobalHookType>(null);
  const [attributesTouched, setAttributesTouched] = useState<{
    [key: string]: boolean;
  }>(false);

  useEffect(() => {
    const key = buildKey(settings?.[0] || {});
    refInputs?.current?.[key]?.current?.focus();
  }, []);

  return (
    <>
      {settings?.map(({
        action_uuid: actionUUID,
        description,
        icon_uuid: iconUUID,
        label,
        name,
        placeholder,
        required,
        type,
      }, idx) => {
        const key = `${actionUUID}:${name}`;
        const ref = refInputs?.current?.[key] || createRef();
        refInputs.current[key] = ref;

        let icon = null;
        if (iconUUID && iconUUID in AllIcons) {
          const Icon = AllIcons?.[iconUUID];
          icon = <Icon />;
        }

        const rowProps = {
          textInput: null,
        };

        if (InteractionInputTypeEnum.TEXT_FIELD === type) {
          rowProps.textInput = {
            ...(icon ? { afterIcon: icon } : {}),
            onChange: (e) => {
              setAttributesTouched(prev => ({
                ...prev,
                [key]: true,
              }));

              return setAttributes(prev => ({
                ...prev,
                [key]: e.target.value,
              }));
            },
            placeholder,
            ref,
            tabIndex: idx + 1,
            value: attributes?.[key],
          };
        }

        return (
          <SetupSectionRow
            {...rowProps}
            description={description}
            key={key}
            invalid={required && attributesTouched?.[key] && !attributes?.[key]}
            title={label}
          />
        );
      })}
    </>
  );
}

export default InteractionForm;
