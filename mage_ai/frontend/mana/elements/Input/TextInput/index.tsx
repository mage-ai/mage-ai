import React, { useRef, useState } from 'react';
import { CommandType } from '@mana/events/interfaces';
import styles from '@styles/scss/elements/Input/TextInput.module.scss';
import styled from 'styled-components';

import inputs, { StyleProps } from '../../../styles/inputs';
import { IconProps } from '@mana/elements/Icon';
import { validatePredicate } from '@mana/hooks/shortcuts/utils';

type InputStyleProps = {
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
} & StyleProps;

type InputProps = {
  Icon?: (props?: any) => any;
  commands?: Record<string, CommandType>;
  autoComplete?: string;
  defaultValue?: string;
  id?: string;
  italic?: boolean | ((value: any) => boolean);
  name?: string;
  number?: boolean;
  onClick?: (event: React.MouseEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  style?: React.CSSProperties;
} & InputStyleProps;

const InputStyled = styled.input<InputStyleProps>`
  ${inputs}
`;

function TextInput(
  {
    Icon,
    defaultValue,
    italic,
    number,
    onChange,
    onClick,
    required,
    id,
    name,
    small,
    ...props
  }: InputProps,
  ref: React.Ref<HTMLInputElement>,
) {
  const iconSizeRef = useRef<number>(16);
  const [value, setValue] = useState(defaultValue);

  return (
    <div className={[styles.container, Icon && styles.withIcon].filter(Boolean).join(' ')}>
      {Icon && (
        <div className={[styles.icon].filter(Boolean).join(' ')}>
          {Icon((iconProps: { size?: number }) => {
            iconSizeRef.current = iconProps?.size ?? iconSizeRef.current;
            return <Icon {...iconProps} size={iconSizeRef.current} />;
          })}
        </div>
      )}

      <InputStyled
        {...props}
        className={[styles.input, Icon && styles[`with-icon-size-${iconSizeRef.current}`]]
          .filter(Boolean)
          .join(' ')}
        id={id}
        italic={
          italic && typeof italic === 'function'
            ? (italic as (val: any) => boolean)?.(value)
            : italic
        }
        name={name}
        onChange={event => {
          setValue(event.target.value);
          if (onChange) {
            onChange(event);
          }
        }}
        onClick={onClick}
        onKeyDown={(event) => {
          if (props.commands) {
            console.log(props.commands, event)
            Object.values(props?.commands ?? {})?.forEach(({
              handler,
              predicate,
            }) => {
              if (validatePredicate(predicate, [event])) {
                handler(event);
              }
            });
          }
        }}
        ref={ref}
        required={required}
        small={small}
        type={number ? 'number' : 'text'}
        value={value || ''}
      />
    </div>
  );
}

export default React.forwardRef(TextInput);
