import EventStreamType, { ServerConnectionStatusType } from '@interfaces/EventStreamType';
import useOutputManager, { OutputManagerProps, OutputManagerType } from './CodeExecution/useOutputManager';
import { DEBUG } from '@components/v2/utils/debug';
import { ExecutionManagerType } from '../../ExecutionManager/interfaces';
import { useEffect, useRef } from 'react';

export type SetContainerType = OutputManagerProps['setContainer'];

export default function useExecutable(
  eventStreamUUID: string,
  consumerUUID: string,
  registerConsumer: ExecutionManagerType['registerConsumer'],
  opts?: {
    autoConnect?: boolean;
  } & OutputManagerProps,
): {
  connect: () => void;
  containerRef: React.RefObject<HTMLDivElement>;
  executeCode: (message: string) => void;
} {
  const { autoConnect } = opts ?? {};
  const handleOnMessageRef = useRef<(event: EventStreamType) => void>(null);

  const { addGroup, containerRef, groupsRef, removeGroup, teardown } = useOutputManager(opts);
  const {
    connect,
    executeCode,
    // Use the same UUID so that all the blocks can synchronize the output.
  } = registerConsumer(eventStreamUUID, consumerUUID, {
    onError: handleError,
    onMessage: handleMessage,
    onOpen: handleOpen,
  });

  function handleError(error: Event) {
    DEBUG.codeExecution.node && console.log('[Node] handleError event source', error);
  }

  function handleOpen(event: Event, status: ServerConnectionStatusType) {
    DEBUG.codeExecution.node && console.log('[Node] handleOpen event source', event, status);
  }

  function handleMessage(event: EventStreamType) {
    if (!handleOnMessageRef?.current) {
      console.error(
        `There is no handler for event stream ${eventStreamUUID} set from consumer ${consumerUUID}`
      );
    }
    handleOnMessageRef?.current?.(event);
  }

  function handleCodeExecution(message: string) {
    const [process, executeHandler] = executeCode(message, {
      future: true,
      connect: !autoConnect,
    });
    addGroup(process, (handler: (event: EventStreamType) => void) => {
      handleOnMessageRef.current = handler;
    }, executeHandler);
  }

  useEffect(() => {
    autoConnect && connect();

    return () => {
      teardown();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoConnect]);

  return {
    connect,
    containerRef,
    executeCode: handleCodeExecution,
  };
}
