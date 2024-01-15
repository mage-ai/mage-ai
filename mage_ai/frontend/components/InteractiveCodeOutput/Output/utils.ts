import KernelOutputType, { ExecutionStatusEnum, ExecutionStateEnum, MsgType } from "@interfaces/KernelOutputType";
import { groupBy } from "@utils/array";

export type TableDataType = {
  columns?: string[];
  index: number;
  rows: (string | number | boolean)[][];
  shape: number[];
};

export function prepareTableData(data: TableDataType): TableDataType {
  return data;
}

export function getLatestOutputGroup(outputs: KernelOutputType[]): KernelOutputType[] {
  const mapping = {};
  let dateMax;
  let groupID;

  outputs?.forEach((item) => {
    const key = item?.msg_id;
    if (!(key in mapping)) {
      mapping[key] = {
        dates: [],
        outputs: [],
      };
    }

    const date = item?.execution_metadata?.date;
    mapping[key].dates.push(date);
    mapping[key].outputs.push(item);

    if (!dateMax) {
      dateMax = date;
    }
    if (date > dateMax) {
      dateMax = date;
      groupID = key;
    }
  });

  return mapping[groupID]?.outputs;
}

export function getExecutionStatusAndState(outputs: KernelOutputType[]): {
  executionStatus: ExecutionStatusEnum;
  executionState: ExecutionStateEnum;
} {
  const errors = outputs?.filter(item => item?.msg_type ===  MsgType.ERROR || item?.error);
  const results = outputs?.filter(item => item?.msg_type ===  MsgType.EXECUTE_RESULT || item?.content || item?.data?.length >= 1);
  const inputs = outputs?.filter(item => item?.msg_type ===  MsgType.EXECUTE_INPUT);

  let status;
  let state = outputs?.[outputs?.length - 1]?.execution_state;

  if (ExecutionStateEnum.IDLE === state) {
    if (errors?.length >= 1) {
      status = ExecutionStatusEnum.FAILED
      state = ExecutionStateEnum.IDLE;
    } else if (!results?.length) {
      status = ExecutionStatusEnum.EMPTY_RESULTS
      state = ExecutionStateEnum.IDLE;
    } else {
      status = ExecutionStatusEnum.SUCCESS
      state = ExecutionStateEnum.IDLE;
    }
  } else if (inputs?.length >= 1) {
    status = ExecutionStatusEnum.RUNNING
    state = ExecutionStateEnum.BUSY;
  } else if (outputs?.length >= 1) {
    status = ExecutionStatusEnum.PENDING
    state = ExecutionStateEnum.QUEUED;
  } else {
    status = ExecutionStatusEnum.PENDING;
    state = ExecutionStateEnum.BUSY;
  }

  return {
    executionStatus: status,
    executionState: state,
  };
}
