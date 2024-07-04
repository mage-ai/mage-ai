import React, { useEffect, useRef } from 'react';

export default function DetailLayout({ children, loadEditorServices }: {
  children: React.ReactNode;
  loadEditorServices?: boolean;
}) {
  const phaseRef = useRef(0);

  // useEffect(() => {
  //   if (loadEditorServices && phaseRef.current === 0) {
  //     const loadServices = async () => {
  //       await import('../../../IDE/Manager').then(mod => {
  //         mod.Manager.loadServices();
  //         phaseRef.current = 1;
  //       });
  //     };

  //     loadServices();
  //   }

  //   const disposeManager = async () => {
  //     await import('../../../IDE/Manager').then(mod => {
  //       mod.Manager.dispose();
  //     });
  //   };

  //   return () => {
  //     disposeManager();
  //   };
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [loadEditorServices]);
  return (
    <>
      {children}
    </>
  )
}
