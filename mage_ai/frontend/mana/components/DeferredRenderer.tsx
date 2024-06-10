import { useDeferredValue, useEffect, useState, useTransition } from 'react';


function DeferredRenderer({
  children,
  idleTimeout,
}: { children: React.ReactNode; idleTimeout: number }): JSX.Element {
  const [render, setRender] = useState(false);
  const [rendering, startTransition] = useTransition();
  const renderDeffered = useDeferredValue(render);

  useEffect(() => {
    if (render) {
      setRender(false);
    }

    const id = requestIdleCallback(() => {
      startTransition(() => {
        setRender(true);
      });
    }, { timeout: idleTimeout });

    return () => cancelIdleCallback(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!renderDeffered || rendering) {
    return <div />;
  }

  return (
    <>
      {children}
    </>
  );
}

export default DeferredRenderer;
