import { VariableTypeEnum } from '@interfaces/CodeExecutionType';

export interface Column {
  Header: string;
  accessor: (row: any, i: number) => string | number;
  index?: boolean;
  sticky?: string;
}

export interface ColumnSetting {
  data?: {
    type?: VariableTypeEnum;
  };
  layout?: {
    width?: {
      percentage?: number;
      minimum?: number;
    };
  };
  uuid: string;
}
