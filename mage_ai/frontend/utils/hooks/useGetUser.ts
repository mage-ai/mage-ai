import { useRouter } from 'next/router';

import { getUser } from '../session';

function useGetUser() {
  const router = useRouter();
  const basePath = router?.basePath;

  return getUser(basePath);
}

export default useGetUser;
