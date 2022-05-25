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

function Data() {

  // TODO: Replace with API Call during Integration
  const ColumnHeaderSample = [
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
        uuid: 'Row 1',
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
  
  const [tab, setTab] = useState('data');
  const viewColumns = (e) => {
    e.preventDefault()
    const pathname = window.location.pathname;
    Router.push(`${pathname}/features`)
  };

  const headEl = (
    <FlexContainer alignItems="right" justifyContent="space-between">
      <Button 
        onClick={viewColumns}
      >
        Change View
      </Button>
    </FlexContainer>
  );

  const dataEl = (
    <SimpleDataTable
      columnFlexNumbers={ Array(ColumnHeaderSample.length).fill(1)}
      columnHeaders={ColumnHeaderSample} 
      rowGroupData={[rowGroupDataSample]}
    />
  )
  const tabsEl = (
      <Tabs 
        defaultKey={tab}
        fullWidth
        noBottomBorder={false}
        onChange={key => setTab(key)}
      >
        <Tab label="Data" key="data">
          <Spacing pb={3} pt={3}>
            {dataEl}
          </Spacing>
        </Tab>
        <Tab label="Report" key="reports">
            <Text large bold> Reports go here </Text> 
        </Tab>
        <Tab label="Visualization" key="visualizations"> </Tab>
      </Tabs>
  )

  return (
    <Layout
      header={ headEl }
      footer={ tabsEl }
    >
      <Text> Current tab is {tab} </Text>
    </Layout>
  );
}

export default Data;