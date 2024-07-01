// import EventStreamType, { ResultType } from '@interfaces/EventStreamType';
// import useEventStreams from '@utils/server/events/useEventStreams';
// import { DEBUG } from '../../utils/debug';
// import { MutateType } from '@api/interfaces';
// import { useMutate } from '@context/APIMutation';

// class CodeExecutionManager {
//   // Class methods: private
//   private static instances: Record<string, CodeExecutionManager> = {}

//   // Instance methods: public
//   public uuid: string = null;
//   // Instance methods: private
//   private codeExecutions: Record<string, CodeExecution> = {};
//   private eventStreams: Record<string, EventStreamType> = {};

//   private constructor(uuid: string) {
//     this.uuid = uuid;
//   }

//   public static getInstance(uuid: string): CodeExecutionManager {
//     if (!(uuid ?? false)) {
//       console.error('Invalid UUID');
//       return;
//     }

//     CodeExecutionManager.instances[uuid] =
//       CodeExecutionManager.instances[uuid] ?? new CodeExecutionManager(uuid);
//   }

//   public execute(message: string) {
//     const { errors, events, loading, sendMessage, status } = useEventStreams(self.uuid);
//   }
// }
