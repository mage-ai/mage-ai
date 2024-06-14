import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

import { AppLoaderProps } from '../interfaces';
import Loading from '@mana/components/Loading';
import useItems from '../hooks/items/useItems';

const MaterialIDE = dynamic(() => import('@components/v2/IDE'), {
  ssr: false,
});

function EditorApp({ app }: AppLoaderProps) {
  const [item, setItem] = useState<any>(null);

  const { api, loading } = useItems();

  useEffect(() => {
    const path = app?.options?.file?.path;
    if (!item && !loading.detail && path) {
      api.detail(encodeURIComponent(path)).then(({ data: { browser_item: item } }) => setItem(item));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app, item, loading]);

  return (
    <>
      {loading.detail && <Loading />}

      {item && (
        <MaterialIDE
          configurations={app?.options?.configurations}
          file={item}
          uuid={app?.uuid}
        />
      )}
    </>
  );
}

export default EditorApp;
