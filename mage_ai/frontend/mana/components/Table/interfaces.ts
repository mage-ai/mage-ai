export interface Column {
  Header: string;
  accessor: (row: any, i: number) => string | number;
  index?: boolean;
  sticky?: string;
}
