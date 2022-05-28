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

  const statistics = useMemo(() => datasetResponse?.statistics || [], [
    datasetResponse?.statistics,
  ]);

  const [columnHeaderSample, setColumnHeaderSample] = useState([{}]);
  const [rowGroupDataSample, setRowGroupDataSample] = useState({});
  const [metricSample, setMetricSample] = useState({});
  
  // TODO: Move to const file 
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const metricsKeys = [
    "count",
    "avg_null_value_count",
    "avg_invalid_value_count",
    "duplicate_row_count",
    "completeness",
    "validity",
  ];

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
    const metricGroupData = {
      rowData: [],
    };

    const metricRows = []
    stats.forEach(function (val) {
      const statpair = [val, statistics[val]]
      const values = {
        columnValues: statpair,
      }
      if (metricsKeys.includes(val)) {
        metricRows.push(values);
      }
    });

    metricGroupData.rowData = metricRows;
    setMetricSample(metricGroupData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statistics]);
  // Report (Quality Metrics)

  /* Given a payload of 
    "count": 100,
    "avg_null_value_count": 10,
    "avg_invalid_value_count": 10,
		"duplicate_row_count": 20, 
		"completeness": 0.9,
    "validity": 0.8,

  /* Turn each key value into a list of tuples. 
  Inside an object called ColumnValues, that's inside RowData (list of Json) */

  // TODO: map keys to text (P1) but for now we'll reuse the string.


  // Report (Statistics)
  const statSample = {
    rowData: [
      {
        columnValues: [
          "Column count", "100",
        ],
      },
      {
        columnValues: [
          "Empty columns", "5 (5%)",
        ],
      },
      {
        columnValues: [
          "Categorical values", "10 (10%)",
        ],
      },
      {
        columnValues: [
          "Numerical values", "20 (20%)",
        ],
      },
      {
        columnValues: [
          "Time values", "55 (55%)",
        ],
      },
      {
        columnValues: [
          "Empty rows", "10 (10%)",
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
