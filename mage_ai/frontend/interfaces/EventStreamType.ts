import { DataTypeEnum } from './KernelOutputType';
import { ErrorDetailsType } from './ErrorsType';

export enum KernelOperation {
  INTERRUPT = 'interrupt',
  RESTART = 'restart',
  TERMINATE = 'terminate',
}

// https://developer.mozilla.org/docs/Web/API/EventSource/readyState
export enum EventSourceReadyState {
  CONNECTING = 0,
  OPEN = 1,
  CLOSED = 2,
}

export enum ResultType {
  DATA = 'data',
  OUTPUT = 'output',
  STATUS = 'status',
  STDOUT = 'stdout',
}

export enum EventStreamTypeEnum {
  EXECUTION = 'execution',
  EXECUTION_STATUS = 'execution_status',
  TASK = 'task',
  TASK_STATUS = 'task_status',
}

export enum ExecutionStatusEnum {
  CANCELLED = 'cancelled',
  ERROR = 'error',
  FAILURE = 'failure',
  INIT = 'init',
  INTERRUPTED = 'interrupted',
  READY = 'ready',
  RESTARTED = 'restarted',
  RUNNING = 'running',
  SUCCESS = 'success',
  TERMINATED = 'terminated',
}

export const STATUS_DISPLAY_TEXT = {
  [ExecutionStatusEnum.CANCELLED]: 'cancelling',
  [ExecutionStatusEnum.INIT]: 'initializing',
  [ExecutionStatusEnum.INTERRUPTED]: 'interrupting',
  [ExecutionStatusEnum.RESTARTED]: 'restarting',
  [ExecutionStatusEnum.SUCCESS]: 'succeeded',
  [ExecutionStatusEnum.TERMINATED]: 'terminating',
};

export enum ServerConnectionStatusType {
  CLOSED = 'closed', // 2
  CONNECTING = 'connecting', // 0
  OPEN = 'open', // 1
  RECONNECTING = 'reconnecting',
}

export interface EventStreamResponseType {
  data: string;
}

export interface ProcessDetailsType {
  exitcode: number | null;
  is_alive: boolean;
  message: string;
  message_request_uuid: string;
  message_uuid: string;
  output_dir?: string;
  output_file?: string;
  pid: number;
  source?: string;
  stream?: string;
  timestamp: number | null;
  uuid: string;
}

export interface ExecutionResultType {
  data_type: DataTypeEnum;
  error?: ErrorDetailsType;
  metadata?: {
    namespace: string;
    path: string;
  };
  output: string | null;
  output_text?: string;
  process: ProcessDetailsType;
  result_id: string;
  status: ExecutionStatusEnum;
  timestamp: number;
  type: ResultType;
  uuid: string;
}

export default interface EventStreamType {
  error: ErrorDetailsType | null;
  event_uuid: string;
  timestamp: number;
  uuid: string;
  result: ExecutionResultType;
  type: EventStreamTypeEnum;
}

export const ReadyStateToServerConnectionStatus = {
  [EventSourceReadyState.CLOSED]: ServerConnectionStatusType.CLOSED,
  [EventSourceReadyState.CONNECTING]: ServerConnectionStatusType.CONNECTING,
  [EventSourceReadyState.OPEN]: ServerConnectionStatusType.OPEN,
};

// {
//   "event_uuid": "b442e0cca7da42c1818e1a45978f8b2e",
//   "timestamp": 1719840843822,
//   "uuid": "spellbinding_kinesis",
//   "error": null,
//   "result": {
//     "data_type": null,
//     "error": {
//       "code": 500,
//       "errors": [
//         "Traceback (most recent call last):\n",
//         "  File \"/home/src/mage_ai/kernels/magic/execution.py\", line 113, in execute_code_async\n    compiled_expr = compile(last_expr, '<string>', 'eval')\n",
//         "  File \"<string>\", line 1\n",
//         "    assert output is not None, 'The output is undefined'\n",
//         "    ^^^^^^\n",
//         "SyntaxError: invalid syntax\n"
//       ],
//       "message": "invalid syntax (<string>, line 1)",
//       "type": "SyntaxError"
//     },
//     "output": null,
//     "process": {
//       "exitcode": null,
//       "is_alive": false,
//       "message": "from typing import List, Tuple\n\nif 'transformer' not in globals():\n    from mage_ai.data_preparation.decorators import transformer\nif 'test' not in globals():\n    from mage_ai.data_preparation.decorators import test\n\n\n@transformer\ndef fixed_chunker(document_data: Tuple[str, str], *args, **kwargs) -> List[Tuple[str, str, str]]:\n    \"\"\"\n    Template for fixed length chunking of a document.\n\n    Args:\n        document_data (Tuple[str, str]): Tuple containing document_id and document_content.\n        max_length (int, optional): Maximum length of each chunk from kwargs.\n\n    Returns:\n        List[Tuple[str, str, str]]: List of tuples containing document_id, document_content, and chunk_text.\n    \"\"\"\n    document_id, document_content = document_data\n    max_length = kwargs.get('max_length', 1000)  # Default value if not provided\n    chunks = []\n\n    for i in range(0, len(document_content), max_length):\n        chunk = document_content[i:i+max_length]\n        chunks.append((document_id, document_content, chunk))\n\n    return chunks\n\n\n@test\ndef test_output(output, *args) -> None:\n    \"\"\"\n    Template code for testing the output of the block.\n    \"\"\"\n    assert output is not None, 'The output is undefined'",
//       "message_request_uuid": "1719840840575",
//       "message_uuid": "8f0a8444c0dd4a25a8d57177535908c7",
//       "pid": "8f0a8444c0dd4a25a8d57177535908c7",
//       "timestamp": null,
//       "uuid": "spellbinding_kinesis"
//     },
//     "status": "error",
//     "type": "status",
//     "uuid": "spellbinding_kinesis",
//     "output_text": "None"
//   },
//   "type": "execution"
// }

// {
//   "event_uuid": "02d5b7d16e804fd7991f5aa30683b628",
//   "timestamp": 1719840953322,
//   "uuid": "spellbinding_kinesis",
//   "error": null,
//   "result": {
//     "data_type": "text/plain",
//     "error": null,
//     "output": "1",
//     "process": {
//       "exitcode": null,
//       "is_alive": false,
//       "message": "import time\n\nfor i in range(10):\n    print(i)\n    time.sleep(2)",
//       "message_request_uuid": "1719840951195",
//       "message_uuid": "c8430018728a4562adbc0b3ef75fc94d",
//       "pid": "c8430018728a4562adbc0b3ef75fc94d",
//       "timestamp": null,
//       "uuid": "spellbinding_kinesis"
//     },
//     "status": "running",
//     "type": "stdout",
//     "uuid": "spellbinding_kinesis",
//     "output_text": "1"
//   },
//   "type": "execution"
// }
