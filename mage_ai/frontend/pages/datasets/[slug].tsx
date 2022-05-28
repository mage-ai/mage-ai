import Router, { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useState } from "react";

import Button from "@oracle/elements/Button";
import Flex from "@oracle/components/Flex";
import FlexContainer from "@oracle/components/FlexContainer";
import Layout from "@oracle/components/Layout";
import SimpleDataTable from "@oracle/components/Table/SimpleDataTable";
import Spacing from "@oracle/elements/Spacing";
import Tabs, { Tab } from "@oracle/components/Tabs";
import Text from "@oracle/elements/Text";
import api from '@api';
import { UNIT } from "@oracle/styles/units/spacing";


function Data() {

  const router = useRouter()
  const { slug } = router.query

  // Datatable
  const { data: datasetResponse } = api.feature_sets.detail(slug);

  const columns = useMemo(() => datasetResponse?.sample_data?.columns || [], [
    datasetResponse?.sample_data?.columns,
  ]);

  const rows = useMemo(() => datasetResponse?.sample_data?.rows || [], [
    datasetResponse?.sample_data?.rows,
  ]);

  const colTypes = useMemo(() => datasetResponse?.metadata?.column_types || [], [
    datasetResponse?.metadata?.column_types,
  ]);

  const statistics = useMemo(() => datasetResponse?.statistics || [], [
    datasetResponse?.statistics,
  ]);

  const [columnHeaderSample, setColumnHeaderSample] = useState([{}]);
  const [rowGroupDataSample, setRowGroupDataSample] = useState({});
  const [metricSample, setMetricSample] = useState({});
  const [statSample, setStatSample] = useState({});
  
  // TODO: Move to const file 
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const metricsKeys = [
    "avg_null_value_count",
    "avg_invalid_value_count",
    "duplicate_row_count",
    "completeness",
    "validity",
  ];

  const statKeys = [
    'count', 'empty_column_count',
  ];

  const CATEGORICAL_TYPES = ['category', 'category_high_cardinality', 'true_or_false'];
  const DATE_TYPES = ['datetime']
  const NUMBER_TYPES = ['number', 'number_with_decimals']
  // const STRING_TYPES = ['email', 'phone_number', 'text', 'zip_code']; // We aren't counting this but good to have.
  const percentageKeys = ["completeness", "validity"];

  // Map text 
  const humanReadableMapping = {
    "avg_invalid_value_count":"Invalid values",
    "avg_null_value_count":"Missing values",
    "completeness":"Completeness",
    "count":"Row count",
    "duplicate_row_count":"Duplicate values",
    "empty_column_count":"Empty features",
    "validity":"Validity",
  };

  // Display priorities to backend keys.
  const metricsSortedMapping = {
    "avg_invalid_value_count":3,
    "avg_null_value_count":2,
    "completeness":1,
    "duplicate_row_count":4,
    "validity":0,
  };

  // Fetch column Headers
  useEffect( () => {
    const headerJSON = [];
    columns.map( (header:any) => {
      headerJSON.push({
        label: header,
      });
    });
    setColumnHeaderSample(headerJSON);
  }, [columns]);

  // Fetch Row values
  useEffect( () => {
    const cells = [];
    rows.map( (rowGroup:any) => { 
      cells.push({
        columnValues: rowGroup,
      });
    });
    setRowGroupDataSample({
      rowData: cells,
    });
  }, [rows]);

  // Calculates metrics
  useEffect( () => {
    const stats = Object.keys(statistics);
    const metricRows = Array(metricsKeys.length).fill(0);
    stats.map( (key) => {
      if (metricsKeys.includes(key)) {
        let value;
        const order = humanReadableMapping[key];
        const index = metricsSortedMapping[key];
        if (percentageKeys.includes(key)) {
          value = statistics[key] * 100;
          value = `${value}%`;
        } else {
          value = statistics[key];
        }
        metricRows[index] = {
          columnValues: [order, value],
        };
      }
    });
    setMetricSample({
      rowData: metricRows,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statistics]);

  // TODO: p1 add percentages to statisics as a ratio.

  // Report (Statistics)
  useEffect( () => {
    const stats = Object.keys(statistics);
    const types = Object.values(colTypes);
    const rowData = [];

    rowData.push({
      columnValues: ["Column count", types.length],
    })
    // Part one is the keys from metrics
    stats.map( (key) => {
      if (statKeys.includes(key)) {
        const name = humanReadableMapping[key];
        rowData.push({
          columnValues: [name, statistics[key]],
        });
      }
    });

    // Part two is the count of data types
    let countCategory = 0;
    let countNumerical = 0;
    let countTimeseries = 0;

    types.map( (val :string) => {
      if (CATEGORICAL_TYPES.includes(val)) {
        countCategory += 1;
      }
      else if (NUMBER_TYPES.includes(val)) {
        countNumerical += 1;
      } else if (DATE_TYPES.includes(val)) {
        countTimeseries += 1;
      }
    });

    rowData.push({
      columnValues: ["Categorical Features", countCategory],
    },{
      columnValues: ["Numerical Features", countNumerical],
    },{
      columnValues: ["Time series Features", countTimeseries],
    });
    
    setStatSample({rowData});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statistics]);

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
        {metricsEl}
      </Flex>
      <Spacing ml={UNIT} />
      <Flex flex={1}>
        {statsEl}
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
      <Tab key="data" label="Data">
        <Spacing mb={3} mt={3} />
        {dataEl}
      </Tab>
      <Tab key="reports" label="Report">
        <Spacing mb={3} mt={3} />
        {reportsEl}
      </Tab>
      <Tab key="visualizations" label="Visualization"> </Tab>
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
