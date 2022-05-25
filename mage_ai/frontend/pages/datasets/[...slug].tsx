
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

function Data() {

  const [tab, setTab] = useState('data');
  const viewColumns = (e) => {
    e.preventDefault()
    const pathname = window.location.pathname;
    Router.push(`${pathname}/features`)
  }

  const HeaderContainerStyle = styled.div<any>`
  `;

  const headEl = (
    <FlexContainer>
      <Button 
        onClick={viewColumns}
      >
        Change View
      </Button>
    </FlexContainer>
  );

  const tabsEl = (
      <Tabs 
        defaultKey={tab}
        noBottomBorder={false}
        onChange={key => setTab(key)}
      >
        <Tab label="Data" key="data">
          <Spacing pb={3} pt={3}>
            <Text> Data goes here </Text>
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
      footer={ tabsEl}
    >
      <Text> Current tab is {tab} </Text>
    </Layout>
  );
}

export default Data;