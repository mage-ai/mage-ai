import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useMutation } from 'react-query';

import api from '@api';
import { AppLoaderProps } from '../interfaces';
import { onSuccess } from '@api/utils/response';
import Loading from '@mana/components/Loading';
import useItems from '../hooks/items/useItems';

const MaterialIDE = dynamic(() => import('@components/v2/IDE'), {
  ssr: false,
});

function EditorApp({ app, addApp, removeApp }: AppLoaderProps) {
  const [item, setItem] = useState<any>(null);

  const { detail, detailLoading } = useItems();

  useEffect(() => {
    const path = app?.options?.file?.path;
    if (!item && !detailLoading && path) {
      detail(encodeURIComponent(path)).then(({ browser_item: item }) => {
        setItem(item);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app, item, detailLoading]);

  return (
    <>
      {detailLoading && <Loading />}

      {item && (
        <MaterialIDE
          // TODO (dangerous): when opening a new file, add app.
          // Deleting a file, remove app.
          // addApp={addApp}
          // removeApp={removeApp}
          configurations={app?.options?.configurations}
          file={item}
          uuid={app?.uuid}
        />
      )}
    </>
  );
}

export default EditorApp;
