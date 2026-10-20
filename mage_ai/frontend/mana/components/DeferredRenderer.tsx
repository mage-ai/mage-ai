import React, { useDeferredValue, useEffect, useMemo, useState, useTransition } from 'react';

import useWithOnMount, { WithOnMount } from '../hooks/useWithOnMount';

function DeferredRenderer({
  children,
  fallback,
  idleTimeout = 0,
  numberOfChildren: numberOfChildrenProp,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  idleTimeout?: number;
  numberOfChildren?: number;
}): JSX.Element {
  const [mounted, setMounted] = useState(false);
  const [mountedChildren, setMountedChildren] = useState<{
    [uuid: string]: boolean;
  }>({});
  const [render, setRender] = useState(false);
  const [rendering, startTransition] = useTransition();

  const renderDeffered = useDeferredValue(render);
  const numberOfChildren = useMemo(
    () => numberOfChildrenProp || React.Children.count(children),
    [children, numberOfChildrenProp],
  );

  useEffect(() => {
    if (render) {
      setRender(false);
    }

    const id = requestIdleCallback(
      () => {
        startTransition(() => {
          setRender(true);
        });
      },
      { timeout: idleTimeout },
    );

    return () => cancelIdleCallback(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isDeferring = useMemo(() => !renderDeffered || rendering, [renderDeffered, rendering]);
  const fallbackMemo = useMemo(
    () => (!mounted || Object.values(mountedChildren || {})?.length < numberOfChildren) && fallback,
    [fallback, mounted, mountedChildren, numberOfChildren],
  );

  const childrenMemo = useWithOnMount({
    children: (
      <>
        {React.Children.map(children, (child, idx: number) => {
          const uuid = `${(React.isValidElement(child) ? child?.key : 'key') || 'child'}-${idx}`;

          return (
            <WithOnMount
              key={uuid}
              onMount={() => {
                setMountedChildren(prev => ({
                  ...prev,
                  [uuid]: true,
                }));
              }}
            >
              {child}
            </WithOnMount>
          );
        })}
      </>
    ),
    onMount: () => {
      startTransition(() => {
        setMounted(true);
      });
    },
  });

  return (
    <>
      {isDeferring && (fallbackMemo || <div />)}
      {!isDeferring && (
        <>
          {fallbackMemo}
          {childrenMemo}
        </>
      )}
    </>
  );
}

export default DeferredRenderer;
