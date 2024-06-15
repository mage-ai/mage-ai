import React, { useRef } from 'react';

import Button, { ButtonGroup } from '@mana/elements/Button';
import KeyboardTextGroup from '@mana/elements/Text/Keyboard/Group';
import { AppLoaderProps } from '../../../interfaces';
import { KEY_SYMBOL_META, KEY_SYMBOL_ENTER } from '@utils/hooks/keyboardShortcuts/constants';
import { Save, PlayButtonFilled } from '@mana/icons';
import TextInput from '@mana/elements/Input/TextInput';
import { FileType, ResourceType } from '@components/v2/IDE/interfaces';
import Grid from '@mana/components/Grid';
import Text from '@mana/elements/Text';

function ToolbarTop(
  props: AppLoaderProps & {
    loading: boolean;
    resource: ResourceType;
    stale: boolean;
    updateLocalContent: (file: FileType) => void;
    updateServerContent: (
      file: FileType,
      payload: {
        content?: string;
        path?: string;
      },
    ) => void;
  },
) {
  const inputRef = useRef<HTMLInputElement>(null);

  const { loading, resource, stale, updateLocalContent, updateServerContent } = props;
  const { main, original } = resource;

  return (
    <Grid
      alignItems='stretch'
      columnGap={8}
      paddingBottom={8}
      paddingTop={8}
      templateColumns={stale ? 'auto auto 1fr' : 'auto 1fr'}
      templateRows='auto'
    >
      {!stale && (
        <ButtonGroup>
          <Button
            Icon={Save}
            basic
            loading={loading}
            onClick={() => {
              updateServerContent(main, {
                path: inputRef?.current?.value || main?.path,
              });
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
      )}

      {stale && (
        <>
          <Text warning xsmall>
            Server content is different from local content. Save the current content or reset it
            with the server content.
          </Text>

          <ButtonGroup>
            <Button asLink loading={loading} onClick={() => updateServerContent(main, main)} small>
              Save local
            </Button>
            <Button
              asLink
              basic
              onClick={event => {
                event.preventDefault();
                updateLocalContent(original);
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
