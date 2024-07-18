import React from 'react';

import Button, { ButtonGroup } from '@mana/elements/Button';
import Grid from '@mana/components/Grid';
import KeyboardTextGroup from '@mana/elements/Text/Keyboard/Group';
import Text from '@mana/elements/Text';
import TextInput from '@mana/elements/Input/TextInput';
import useToolbars, { ToolbarsType } from '../useToolbars';
import { KEY_SYMBOL_META, KEY_SYMBOL_ENTER } from '@utils/hooks/keyboardShortcuts/constants';
import { Save, PlayButtonFilled } from '@mana/icons';

function ToolbarTop({
  loading,
  ...props
}: {
  loading?: boolean;
} & ToolbarsType) {
  const {
    inputRef,
    main,
    overrideLocalContentFromServer,
    overrideServerContentFromLocal,
    saveCurrentContent,
    stale,
  } = useToolbars(props);

  return (
    <Grid
      alignItems="stretch"
      columnGap={8}
      paddingBottom={8}
      paddingTop={8}
      templateColumns={stale ? 'auto auto 1fr' : 'auto 1fr'}
      templateRows="auto"
    >
      {!stale && (
        <ButtonGroup>
          <Button
            Icon={Save}
            basic
            loading={loading}
            onClick={event => saveCurrentContent(event as any)}
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
      )}

      {stale && (
        <>
          <Text warning xsmall>
            Server content is different from local content. Save the current content or reset it
            with the server content.
          </Text>

          <ButtonGroup>
            <Button asLink loading={loading} onClick={(event) => overrideServerContentFromLocal(event as any)} small>
              Save local
            </Button>
            <Button
              asLink
              basic
              onClick={event => {
                event.preventDefault();
                overrideLocalContentFromServer();
              }}
              small
            >
              Reset
            </Button>
          </ButtonGroup>
        </>
      )}

      <TextInput defaultValue={main?.path || ''} monospace muted ref={inputRef} small />
    </Grid>
  );
}

export default ToolbarTop;
