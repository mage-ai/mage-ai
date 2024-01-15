import React, { useRef } from 'react';

function ComponentWithCallback({
  callback,
  children,
  id,
}: {
  callback: () => void;
  children: JSX.Element | JSX.Element[];
  id: string;
}, ref) {
  const timeout = useRef(null);
  timeout.current = setTimeout(() => {
    callback();
  }, 1);

  return (
    <div ref={ref} id={id}>
      {children}
    </div>
  );
}

export default React.forwardRef(ComponentWithCallback);
