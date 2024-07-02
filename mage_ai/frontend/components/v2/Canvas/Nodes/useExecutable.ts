// import EventStreamType, { ProcessDetailsType } from '@interfaces/EventStreamType';
// import useOutputManager, { OutputManagerType } from './CodeExecution/useOutputManager';
// import { RegisterConsumer, EventSourceHandlers } from '../../ExecutionManager/interfaces';
// import { useRef } from 'react';

// export type SetContainerType = OutputManagerType['setContainer'];

// export default function useExecutable(
//   eventStreamUUID: string,
//   consumerUUID: string,
//   registerConsumer: RegisterConsumer,
//   opts?: {
//     onError?: EventSourceHandlers['onError'];
//     onOpen?: EventSourceHandlers['onOpen'];
//   },
// ): {
//   containerRef: React.RefObject<HTMLDivElement>;
//   executeCode: (
//     message: string,
//     opts?: {
//       connect?: boolean;
//       future?: boolean;
//     },
//   ) => [ProcessDetailsType, () => void] | [ProcessDetailsType, undefined];
//   removeGroup: OutputManagerType['removeGroup'];
//   teardown: () => void;
// } {
//   const handleOnMessageRef = useRef<(event: EventStreamType) => void>(null);

//   const { addGroup, containerRef, removeGroup, teardown } = useOutputManager();
//   const {
//     executeCode: executeCodeBase,
//     // Use the same UUID so that all the blocks can synchronize the output.
//   } = registerConsumer(eventStreamUUID, consumerUUID, {
//     onError: opts?.onError,
//     onMessage: handleMessage,
//     onOpen: opts?.onOpen,
//   });

//   function handleMessage(event: EventStreamType) {
//     if (!consumerUUID || event?.result?.process?.source !== consumerUUID) return;

//     if (!handleOnMessageRef?.current) {
//       console.error(
//         `There is no handler for event stream ${eventStreamUUID} set from consumer ${consumerUUID}`
//       );
//     }
//     handleOnMessageRef?.current?.(event);
//   }

//   function executeCode(
//     message: string,
//     subscriber: (onMessage: (event: EventStreamType) => void) => void,
//     opts?: {
//       connect?: boolean;
//       future?: boolean;
//     },
//   ): [ProcessDetailsType, () => void] | [ProcessDetailsType, undefined] {
//     const [process, executeHandler] = executeCodeBase(message, {
//       ...opts,
//       future: true,
//     });

//     const execute = () => {
//       addGroup(
//         process.message_request_uuid,
//         subscriber,
//         () => executeHandler(),
//       );
//     };

//     if (opts?.future) {
//       return [process, execute] as [ProcessDetailsType, () => void];
//     }

//     return [process, execute()] as [ProcessDetailsType, undefined];
//   }

//   return {
//     containerRef,
//     executeCode,
//     removeGroup,
//     teardown,
//   };
// }
