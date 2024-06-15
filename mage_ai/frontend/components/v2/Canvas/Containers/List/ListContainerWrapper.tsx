import type { FC } from 'react';
import { useEffect, useState } from 'react';

import ListContainer from './ListContainer';

const ListContainerWrapper: FC = () => {
  console.log('ListContainerWrapper render');
  // Avoid rendering on server because the big data list is generated
  const [shouldRender, setShouldRender] = useState(false);
  // Won't fire on server.
  useEffect(() => setShouldRender(true), []);
  return <>{shouldRender && <ListContainer />}</>;
};

export default ListContainerWrapper;
