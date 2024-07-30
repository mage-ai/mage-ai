import React, { useEffect, useRef } from 'react';
import TextInput from '@mana/elements/Input/TextInput';
import stylesHeader from '@styles/scss/layouts/Header/Header.module.scss';
import { IconProps } from '@mana/elements/Icon';
import { SearchV3 } from '@mana/icons';

export type SearchAppType = {
  Icon?: (iconProps: IconProps) => any;
  defaultValue?: string;
  enabled?: boolean;
  inputRef?: React.MutableRefObject<HTMLInputElement>;
  onChange?: (event: any) => void;
  placeholder?: string;
  setMountRef?: (ref: React.MutableRefObject<HTMLDivElement>) => void;
  style?: React.CSSProperties;
};

export default function SearchApplication({
  Icon,
  defaultValue,
  enabled,
  inputRef,
  onChange,
  placeholder,
  setMountRef,
  style,
}: SearchAppType) {
  const itemsMountRef = useRef<HTMLDivElement>(null);
  const _inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (enabled && itemsMountRef.current && setMountRef) {
      setMountRef(itemsMountRef);
    }
  }, [enabled, setMountRef]);

  return (
    <>
    {enabled && (
      <TextInput
        Icon={ip => {
          const IconUse = Icon ?? SearchV3;

          return <IconUse {...ip} className={stylesHeader.buttonIcon} size={16} />
        }}
        basic
        defaultValue={defaultValue ?? ''}
        onChange={onChange}
        placeholder={placeholder ?? ''}
        ref={inputRef ?? _inputRef}
        small
        style={{
          height: 40,
          minWidth: 400,
          ...style,
        }}
      />
    )}

      <div ref={itemsMountRef} />
    </>
  );
}
