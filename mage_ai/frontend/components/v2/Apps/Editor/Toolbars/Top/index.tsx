import React from 'react';

import Button, { ButtonGroup } from '@mana/elements/Button';
import KeyboardTextGroup from '@mana/elements/Text/Keyboard/Group';
import Loading from '@mana/components/Loading';
import { AppLoaderProps, AppLoaderResultType } from '../../../interfaces';
import { KEY_SYMBOL_META, KEY_SYMBOL_ENTER } from '@utils/hooks/keyboardShortcuts/constants';
import { Save, Trash, Add, PlayButtonFilled } from '@mana/icons';
import useItems from '../../../hooks/items/useItems';

function ToolbarTop(props: AppLoaderProps) {
  const { api, loading } = useItems();

  return (
    <ButtonGroup>
      <Button
        Icon={Add}
        basic
        onClick={() => {
          console.log('browse');
        }}
        small
      />
      <Button
        Icon={Save}
        basic
        onClick={() => {
          console.log('browse');
        }}
        small
      />
      <Button
        Icon={Trash}
        basic
        onClick={() => {
          console.log('browse');
        }}
        small
      />
      <Button
        Icon={PlayButtonFilled}
        basic
        onClick={() => {
          console.log('browse');
        }}
        secondary
        small
        tag={
          <KeyboardTextGroup
            inverted
            monospace
            textGroup={[[KEY_SYMBOL_META, KEY_SYMBOL_ENTER]]}
            xsmall
          />
        }
      />
    </ButtonGroup>
  );
}

export default ToolbarTop;
