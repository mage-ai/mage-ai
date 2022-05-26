import React from "react";
import SimpleDataTable from '@oracle/components/Table/SimpleDataTable';
import SimpleDataTableProps from '@oracle/components/Table/SimpleDataTable';
import Panel from "@oracle/components/Panel";

import styled from 'styled-components';

type MetricsTableProps = {
  children: any;
  overall: string;
};

const rowGroupDataSample = {
  rowData: [
    {
      columnValues: [
        "1", "2", "3", "4", "5",
      ],
      uuid: 'Row 1',
    },
    {
      columnValues: [
        "1", "2", "3", "4", "5",
      ],
      uuid: 'Row 2',
    },
  ],
}

// Contains 2 Things. Whether it has an Icon, and what the feature is.
const ColumnHeaderSample = [
  {
    Icon: true,
    label: "Feature 1",
  },
  {
    Icon: true,
    label: "Feature 2",   
  },
  {
    Icon: true,
    label: "Feature 3",
  },
]

// The headerTitle and Subtitle will be given by backend I presume?
function MetricsTable({ children, ...props }: MetricsTableProps) {
  
  return (
  <Panel 
    headerTitle="Quality Metrics"
    {...props}
  > 
  
  </Panel>
  );
};

export default MetricsTable;