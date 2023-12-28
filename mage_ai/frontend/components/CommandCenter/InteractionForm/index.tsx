import { createRef, useEffect, useRef, useState } from 'react';

import * as AllIcons from '@oracle/icons';
import FlexContainer from '@oracle/components/FlexContainer';
import SetupSection, { SetupSectionRow } from '@components/shared/SetupSection';
import Text from '@oracle/elements/Text';
import TextInput from '@oracle/elements/Inputs/TextInput';
import {
  InteractionInputType,
  InteractionInputTypeEnum,
} from '@interfaces/InteractionType';

function InteractionForm({
  item,
  action,
}) {
  const {
    payload_keys_user_input_required: payloadKeysUserInputRequired,
  } = action?.request || {};

  console.log(item, action)

  const refInputs = useRef({});

  const [attributes, setAttributes] = useState<GlobalHookType>(null);
  const [attributesTouched, setAttributesTouched] = useState<{
    [key: string]: boolean;
  }>(false);

  useEffect(() => {
    const key = Object.keys(payloadKeysUserInputRequired || {})?.[0];
    refInputs?.current?.[key]?.current?.focus();
  }, [payloadKeysUserInputRequired]);

  return (
    <>
      {Object.entries(payloadKeysUserInputRequired || {}).map(([
        key,
        value,
      ], idx) => {
        const {
          description,
          icon_uuid: iconUUID,
          label,
          options,
          placeholder,
          required,
          style,
          type,
        }: InteractionInputType = value;

        const ref = refInputs?.current?.[key] || createRef();
        refInputs.current[key] = ref;

        let icon = null;
        if (iconUUID && iconUUID in AllIcons) {
          const Icon = AllIcons?.[iconUUID];
          icon = <Icon />;
        }

        return (
          <SetupSectionRow
            description={description}
            key={key}
            invalid={required && attributesTouched?.[key] && !attributes?.[key]}
            textInput={{
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
            }}
            title={label}
          />
        );
      })}
    </>
  );
}

export default InteractionForm;
