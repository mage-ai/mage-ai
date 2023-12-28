import { createRef, useEffect, useRef, useState } from 'react';

import * as AllIcons from '@oracle/icons';
import FlexContainer from '@oracle/components/FlexContainer';
import SetupSection, { SetupSectionRow } from '@components/shared/SetupSection';
import Text from '@oracle/elements/Text';
import TextInput from '@oracle/elements/Inputs/TextInput';
import { ApplicationProps } from '../ItemApplication/constants';
import { CommandCenterItemType } from '@interfaces/CommandCenterType';
import { InteractionInputTypeEnum } from '@interfaces/InteractionType';
import { dig, setNested } from '@utils/hash';

function InteractionForm({
  executeAction,
  focusedItemIndex,
  item,
}: ApplicationProps) {
  const refInputs = useRef({});

  const settings = item?.application?.settings || [];

  const [attributes, setAttributes] = useState<GlobalHookType>(null);
  const [attributesTouched, setAttributesTouched] = useState<{
    [key: string]: boolean;
  }>(false);

  useEffect(() => {
    if (settings?.length >= 1) {
      const setting = settings?.[0] || {};
      const key = [setting?.action_uuid, setting?.name].join('.');
      setTimeout(() => refInputs?.current?.[key]?.current?.focus(), 1);
    }
  }, []);

  return (
    <>
      {settings?.map(({
        action_uuid: actionUUID,
        description,
        icon_uuid: iconUUID,
        label,
        monospace,
        name,
        placeholder,
        required,
        type,
      }, idx) => {
        const key = [actionUUID, name].join('.');
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
            value: dig(attributes || {}, name),
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
      })}
    </>
  );
}

export default InteractionForm;
