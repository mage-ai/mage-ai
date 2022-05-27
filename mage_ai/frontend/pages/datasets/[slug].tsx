import Router, { useRouter } from 'next/router';
import { useState } from "react";

import Button from "@oracle/elements/Button";
import Flex from "@oracle/components/Flex";
import FlexContainer from "@oracle/components/FlexContainer";
import Layout from "@oracle/components/Layout";
import SimpleDataTable from "@oracle/components/Table/SimpleDataTable";
import Spacing from "@oracle/elements/Spacing";
import Tabs, { Tab } from "@oracle/components/Tabs";
import Text from "@oracle/elements/Text";
import { UNIT } from "@oracle/styles/units/spacing";
import api from '@api';

function Data() {

  const router = useRouter()
  const { slug } = router.query
  console.log("Dataset ID from page:", slug);

  // TODO: Replace with API Call during Integration

  // Datatable
  const datatable_values = api.feature_sets.detail(slug);
  console.log("Response from backend", datatable_values);

  const columnHeaderSample = [
    {
      label: "Number of purchases",
    },
    {
      Icon: true,
      label: "Customer_ID",   
    },
    {
      label: "Product_ID",
    },
    {
      label: "Rating",
    },
  ];
  
  const rowGroupDataSample = {
    rowData: [
      {
        columnValues: [
          "1", "2", "3", "4"
        ],
      },
      {
        columnValues: [
          "1", "2", "3", "4"
        ],
        uuid: 'Row 2',
      },
      {
        columnValues: [
          "1", "2", "3", "4"
        ],
        uuid: 'Row 3',
      },
      {
        columnValues: [
          "11", "2", "3", "4"
        ],
        uuid: 'Row 4',
      },
      {
        columnValues: [
          "13", "2", "3", "4"
        ],
        uuid: 'Row 5',
      },
      {
        columnValues: [
          "1000001", "2", "3", "4"
        ],
        uuid: 'Row 6',
      },
      {
        columnValues: [
          "5", "4", "3", "2"
        ],
        uuid: 'Row 7',
      },
    ],
  };

  // Report (Quality Metrics)

  /* Given a payload of 
  statistics: {
    "avg_null_value_count": 10,
    "avg_invalid_value_count": 10,
    "duplicate_row_count": 20, 
    "completeness": 0.9,
    "validity": 0.8,
  }
  */

  /* Turn each key value into a list of tuples. 
  Inside an object called ColumnValues, that's inside RowData (list of Json) */

  // TODO: map keys to text (P2)

  // This first statistics portion will contain the missing values, invalid values, duplicate values, and show validity and completeness.
  const metricSample = {
    rowData: [
      {
        columnValues: [
          "Validity", "0.8"
        ],
      },
      {
        columnValues: [
          "Completeness", "0.9"
        ],
      },
      {
        columnValues: [
          "Missing values", "20"
        ],
      },
      {
        columnValues: [
          "Invalid values", "20"
        ],
      },
      {
        columnValues: [
          "Duplicate values", "20"
        ],
      },
    ],
  };

  // Report (Statistics)
  const statSample = {
    rowData: [
      {
        columnValues: [
          "Column count", "100"
        ],
      },
      {
        columnValues: [
          "Empty columns", "5 (5%)"
        ],
      },
      {
        columnValues: [
          "Categorical values", "10 (10%)"
        ],
      },
      {
        columnValues: [
          "Numerical values", "20 (20%)"
        ],
      },
      {
        columnValues: [
          "Time values", "55 (55%)"
        ],
      },
      {
        columnValues: [
          "Empty rows", "10 (10%)"
        ],
      },
    ],
  };


  const [tab, setTab] = useState('data');
  const viewColumns = (e) => {
    const pathname = window?.location?.pathname;
    e.preventDefault()
    Router.push(`${pathname}/features`)
  };


  const headEl = (
    <FlexContainer alignItems="justify-right" flexDirection="row-reverse" >
      <Button 
        onClick={viewColumns}
      >
        <Text bold> Column view </Text>
      </Button>
    </FlexContainer>
  );

  const dataEl = (
    <SimpleDataTable
      columnFlexNumbers={ Array(columnHeaderSample.length).fill(1)}
      columnHeaders={columnHeaderSample} 
      rowGroupData={[rowGroupDataSample]}
    />
  );

  const metricsEl = (
    <SimpleDataTable
      columnFlexNumbers={[1, 1]}
      columnHeaders={[{label:'Quality Metrics',},]}
      rowGroupData={[metricSample]}
    />
  );

  const statsEl = (
    <SimpleDataTable
      columnFlexNumbers={[1, 1, 1]}
      columnHeaders={[{label:'Statistics',},]}
      rowGroupData={[statSample]}
    />
  );

  const reportsEl = (
    <FlexContainer justifyContent={'center'}>
      <Flex flex={1}>
        {statsEl}
      </Flex>
      <Spacing ml={UNIT} />
      <Flex flex={1}>
        {metricsEl}
      </Flex>
    </FlexContainer>
  )

  const tabsEl = (
    <Tabs
      bold
      defaultKey={tab}
      large
      noBottomBorder={false}
      onChange={key => setTab(key)}
    >
      <Tab label="Data" key="data">
        <Spacing mb={3} mt={3} />
        {dataEl}
      </Tab>
      <Tab label="Report" key="reports">
        <Spacing mb={3} mt={3} />
        {reportsEl}
      </Tab>
      <Tab label="Visualization" key="visualizations"> </Tab>
    </Tabs>
  )

  return (
    <Layout
      centerAlign
    >
      <Spacing mt={UNIT} />
      {headEl}
      <Spacing mt={UNIT} />
      {tabsEl}
    </Layout>
  );
}

export default Data;
