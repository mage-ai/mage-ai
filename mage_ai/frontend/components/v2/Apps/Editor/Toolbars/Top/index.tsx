import React, { useCallback, useMemo, useState } from 'react';

import Button, { ButtonGroup } from '@mana/elements/Button';
import KeyboardTextGroup from '@mana/elements/Text/Keyboard/Group';
import { AppLoaderProps, AppLoaderResultType } from '../../../interfaces';
import { FileCacheType, getFileCache, isStale, updateFileCache } from '../../../../IDE/cache';
import { KEY_SYMBOL_META, KEY_SYMBOL_ENTER } from '@utils/hooks/keyboardShortcuts/constants';
import { Save, Trash, Add, PlayButtonFilled } from '@mana/icons';
import useItems from '../../../hooks/items/useItems';
import { FileType, ResourceType } from '@components/v2/IDE/interfaces';
import Grid from '@mana/components/Grid';
import Text from '@mana/elements/Text';

function ToolbarTop(props: AppLoaderProps) {
  const { app } = props;
  const { api, loading } = useItems();

  const [itemInit, setItem] = useState<FileType>(app?.options?.file);
  const stale = useMemo(() => isStale(itemInit?.path), [itemInit]);
  const { client, server } = useMemo(() => getFileCache(itemInit?.path) || {} as FileCacheType, [itemInit]);
  const item = useMemo(() => ({
    ...(itemInit || {}),
    ...(client?.file || {}),
  }), [client, itemInit]);

  const resetContent = useCallback(async (file: FileType) => {
    await import('../../../../IDE/Manager').then((mod) => {
      mod.Manager.setValue(file);

      updateFileCache({
        client: file,
        server: file,
      });
      setItem(file);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Grid
      alignItems="center"
      columnGap={12}
      templateColumns={stale ? 'auto 1fr' : '1fr'}
      templateRows="auto"
    >
      {!stale && (
        <ButtonGroup>
          <Button
            Icon={Save}
            basic
            loading={loading?.update}
            onClick={() => {
              api.update(item?.path, { content: item?.content }).then(setItem);
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
      )}

      {stale && (
        <>
          <Text warning xsmall>
            Server content is different from local content.
            Save the current content or reset it with the server content.
          </Text>

          <ButtonGroup>
            <Button
              asLink
              loading={loading?.update}
              onClick={() => {
                api.update(item?.path, { content: item?.content }).then(setItem);
              }}
              small
            >
              Save local
            </Button>
            <Button
              asLink
              basic
              onClick={(event) => {
                event.preventDefault();
                server?.file && resetContent(server?.file);
              }}
              small
            >
              Reset
            </Button>
          </ButtonGroup>
        </>
      )}
    </Grid>
  );
}

export default ToolbarTop;
