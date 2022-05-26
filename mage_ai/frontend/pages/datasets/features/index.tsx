import Button from "@oracle/elements/Button";
import Layout from "@oracle/components/Layout";
import Text from "@oracle/elements/Text";

import Router from 'next/router';
import FlexContainer from "@oracle/components/FlexContainer";
import Tabs, { Tab } from "@oracle/components/Tabs";
import Panel from "@oracle/components/Panel";
import styled from "styled-components";
import { useState } from "react";
import Spacing from "@oracle/elements/Spacing";
import SimpleDataTable from "@oracle/components/Table/SimpleDataTable";
import { UNIT } from "@oracle/styles/units/spacing";
import Flex from "@oracle/components/Flex";

function Feature() {

  // TODO: Replace with API Call during Integration


  // Column Summary (Quality Metrics)

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

  // Columns (Statistics)
  const colSample = {
    rowData: [
      {
        columnValues: [
          "Sophie Jung"
        ],
      },
      {
        columnValues: [
          "Lena Perrin"
        ],
      },
      {
        columnValues: [
          "Dennis Thompson"
        ],
      },
      {
        columnValues: [
          "Dennis Thompson"
        ],
      },
      {
        columnValues: [
          "Joseph Gauthier"
        ],
      },
      {
        columnValues: [
          "Alexis Rolland"
        ],
      },
    ],
    title: "Users",
  };

  const warningSample = {
    rowData: [
      {
        columnValues: [
          "Outliers", "100"
        ],
      },
      {
        columnValues: [
          "Anomalies", "5 (5%)"
        ],
      },
      {
        columnValues: [
          "Skewed", "10 (10%)"
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

  const colEl = (
    <SimpleDataTable
      columnFlexNumbers={[1, 1]}
      columnHeaders={[{label:'Quality Metrics',},]}
      rowGroupData={[colSample]}
    />
  )
  const metricsEl = (
    <SimpleDataTable
      columnFlexNumbers={[1, 1]}
      columnHeaders={[{label:'Quality Metrics',},]}
      rowGroupData={[metricSample]}
    />
  );

  const warnEl = (
    <SimpleDataTable
      columnFlexNumbers={[1, 1]}
      columnHeaders={[{label:'Quality Metrics',},]}
      rowGroupData={[warningSample]}
    />
  );

  // Column Data and Metrics 
  const dataEl = (
    <FlexContainer justifyContent={'center'}>
      <Flex flex={1}>
        {colEl}
      </Flex>
      <Spacing ml={UNIT} />
      <Flex flex={1}>
        {metricsEl}
      </Flex>
    </FlexContainer>
  );


  // Metrics and Warnings
  const reportsEl = (
    <FlexContainer justifyContent={'center'}>
      <Flex flex={1}>
        {metricsEl}
      </Flex>
      <Spacing ml={UNIT} />
      <Flex flex={1}>
        {warnEl}
      </Flex>
    </FlexContainer>
  )

  const tabsEl = (
      <Tabs
        bold
        defaultKey={tab}
        noBottomBorder={false}
        onChange={key => setTab(key)}
      >
        <Tab label="Data" key="data">
        <Spacing mb={3} mt={3}></Spacing>
          {dataEl}
        </Tab>
        <Tab label="Report" key="reports">
        <Spacing mb={3} mt={3}></Spacing>
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
      { headEl }
      <Spacing mt={UNIT} />
      { tabsEl }
    </Layout>
  );
}

export default Feature;