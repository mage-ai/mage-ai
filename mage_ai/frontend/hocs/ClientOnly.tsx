import { useEffect, useState } from 'react';

type ClientOnlyProps = {
  children: any;
};

// Checks if rendering is being done on server in order to prevent hydration issues
export function ClientOnly({
  children,
}: ClientOnlyProps) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return <div />;
  }

  return children;
}

export default ClientOnly;
