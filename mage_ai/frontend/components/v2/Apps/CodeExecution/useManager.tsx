// import useEventStreams from '@utils/server/events/useEventStreams';
// import { DEBUG } from '../../utils/debug';
// import { MutateType } from '@api/interfaces';
// import { useMutate } from '@context/APIMutation';

// function debugLog(message: any, args?: any | any[]) {
//   const arr = [`[CodeExecutionManager] ${message}`];
//   if (Array.isArray(args)) {
//     arr.push(...args);
//   } else if (args) {
//     arr.push(args);
//   }
//   DEBUG.codeExecution.manager && console.log(...arr);
// }

// export default function useManager() {
//   const mutants = useMutate({ resource: 'code_executions' });
//   mutants.create.mutate({
//     payload: {
//       message: '',
//       message_request_uuid: '',
//       timestamp: '',
//       uuid: '',
//     }
//   });
// }
