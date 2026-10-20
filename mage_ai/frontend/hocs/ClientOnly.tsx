import { useEffect, useState } from 'react';

type ClientOnlyProps = {
  children: any;
};

export function ClientOnly({ children }: ClientOnlyProps) {
  // Checks if rendering is being done on server in order to prevent hydration issues
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  return <>{hasMounted && children}</>;
}

export default ClientOnly;
