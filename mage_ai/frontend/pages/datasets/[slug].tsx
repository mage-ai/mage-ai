import React, { useEffect, useMemo, useState } from 'react';
import Router, { useRouter } from 'next/router';

import ActionForm from '@components/ActionForm';
import Button from '@oracle/elements/Button';
import FeatureProfiles from '@components/datasets/FeatureProfiles';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Layout from '@oracle/components/Layout';
import Overview from '@components/datasets/Insights/Overview';
import PageBreadcrumbs from '@components/PageBreadcrumbs';
import Select from '@oracle/elements/Inputs/Select';
import SimpleDataTable, { ColumnHeaderType, RowGroupDataType } from '@oracle/components/Table/SimpleDataTable';
import Spacing from '@oracle/elements/Spacing';
import SuggestionsList from '@components/suggestions/SuggestionsList';
import Tabs, { Tab } from '@oracle/components/Tabs';
import Text from '@oracle/elements/Text';
import TransformerActionType from '@interfaces/TransformerActionType';
import actionsConfig from '@components/ActionForm/actions';
import api from '@api';
import { UNIT } from '@oracle/styles/units/spacing';

function Data() {
  const router = useRouter();
  const { slug } = router.query;

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
  
  const features = Object.entries(datasetResponse?.metadata?.column_types || {})
    .map(([k, v]: [string, string]) => ({ columnType: v, uuid: k }));

  const [columnHeaderSample, setColumnHeaderSample] = useState<ColumnHeaderType[]>([]);
  const [metricSample, setMetricSample] = useState<RowGroupDataType>();
  const [statSample, setStatSample] = useState<RowGroupDataType>();

  const [rowGroupDataSample, setRowGroupDataSample] = useState<RowGroupDataType>();

  const metricsKeys = [
    'avg_null_value_count',
    'avg_invalid_value_count',
    'duplicate_row_count',
    'completeness',
    'validity',
  ];

  const statKeys = [
    'count', 'empty_column_count',
  ];

  const CATEGORICAL_TYPES = ['category', 'category_high_cardinality', 'true_or_false'];
  const DATE_TYPES = ['datetime'];
  const NUMBER_TYPES = ['number', 'number_with_decimals'];
  // const STRING_TYPES = ['email', 'phone_number', 'text', 'zip_code']; // We aren't counting this but good to have.
  const percentageKeys = ['completeness', 'validity'];

  // Map text
  const humanReadableMapping = {
    'avg_invalid_value_count': 'Invalid values',
    'avg_null_value_count': 'Missing values',
    'completeness': 'Completeness',
    'count': 'Row count',
    'duplicate_row_count': 'Duplicate values',
    'empty_column_count': 'Empty features',
    'validity': 'Validity',
  };

  // Display priorities to backend keys.
  const metricsSortedMapping = {
    'avg_invalid_value_count': 3,
    'avg_null_value_count': 2,
    'completeness': 1,
    'duplicate_row_count': 4,
    'validity': 0,
  };

  // Fetch column Headers
  useEffect(() => {
    const headerJSON = [];
    columns.map((header:any) => {
      headerJSON.push({
        label: header,
      });
    });
    setColumnHeaderSample(headerJSON);
  }, [columns]);

  // Fetch Row values
  useEffect(() => {
    const cells = [];
    rows.map((rowGroup:any) => {
      cells.push({
        columnValues: rowGroup,
      });
    });
    setRowGroupDataSample({
      rowData: cells,
    });
  }, [rows]);

  // Calculates metrics
  useEffect(() => {
    const stats = Object.keys(statistics);
    const metricRows = Array(metricsKeys.length).fill(0);
    stats.map((key) => {
      if (metricsKeys.includes(key)) {
        let value = statistics[key].toPrecision(2);
        const order = humanReadableMapping[key];
        const index = metricsSortedMapping[key];
        if (percentageKeys.includes(key)) {
          value *= 100;
          value = `${value}%`;
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

  // Report (Quality Metrics)

  // TODO: p1 add percentages to statisics as a ratio.

  // Report (Statistics)
  useEffect(() => {
    const stats = Object.keys(statistics);
    const types = Object.values(colTypes);
    const rowData = [];

    rowData.push({
      columnValues: ['Column count', types.length],
    });
    // Part one is the keys from metrics
    stats.map((key) => {
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

    types.map((val: string) => {
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
      columnValues: ['Categorical Features', countCategory],
    },{
      columnValues: ['Numerical Features', countNumerical],
    },{
      columnValues: ['Time series Features', countTimeseries],
    });

    setStatSample({ rowData });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statistics]);

  const [tab, setTab] = useState('data');
  const viewColumns = (e) => {
    const pathname = window?.location?.pathname;
    e.preventDefault();
    Router.push(`${pathname}/features`);
  };

  const headEl = (
    <FlexContainer alignItems="center" justifyContent="space-between">
      <PageBreadcrumbs featureSet={datasetResponse} />
      <Button onClick={viewColumns}>
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

  // Old app used [2, 1, 1]
  const metricsEl = (
    <SimpleDataTable
      columnFlexNumbers={[1, 1]}
      columnHeaders={[{ label: 'Quality Metrics' }]}
      rowGroupData={[metricSample]}
    />
  );

  // Old app used: [1, 5]
  const statsEl = (
    <SimpleDataTable
      columnFlexNumbers={[1, 1, 1]}
      columnHeaders={[{ label: 'Statistics' }]}
      rowGroupData={[statSample]}
    />
  );

  const reportsEl = (
    <>
      <FlexContainer justifyContent={'center'}>
        <Flex flex={1}>
          <SimpleDataTable
            columnFlexNumbers={[1, 1]}
            columnHeaders={[{ label: 'Quality Metrics' }]}
            rowGroupData={metricSample && [metricSample]}
          />
        </Flex>
        <Spacing ml={8} />
        <Flex flex={1}>
          <SimpleDataTable
            columnFlexNumbers={[1, 1, 1]}
            columnHeaders={[{ label: 'Statistics' }]}
            rowGroupData={statSample && [statSample]}
          />
        </Flex>
      </FlexContainer>
      <Spacing my={8}>
        <FeatureProfiles
          features={features}
          statistics={statistics}
        />
      </Spacing>
    </>
  );

  const insightsOverview = datasetResponse?.['insights']?.[1] || {};

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
        <SimpleDataTable
          columnFlexNumbers={ Array(columnHeaderSample.length).fill(1)}
          columnHeaders={columnHeaderSample}
          rowGroupData={rowGroupDataSample && [rowGroupDataSample]}
        />
      </Tab>
      <Tab key="reports" label="Reports">
        <Spacing mb={3} mt={3} />
        {reportsEl}
      </Tab>
      <Tab key="visualizations" label="Visualizations">
        <Spacing mb={3} mt={3} />
        <Overview
          features={features}
          insightsOverview={insightsOverview}
          statistics={statistics}
        />
      </Tab>
    </Tabs>
  );

  const [actionPayload, setActionPayload] = useState<TransformerActionType>();
  const actionType = actionPayload?.action_type;
  const saveAction = (data) => {
    const updatedAction = {
      action_payload: {
        ...data,
        action_type: actionType,
      },
    };
    alert(JSON.stringify(updatedAction));
  };

  return (
    <Layout
      centerAlign
      footer={<Spacing mt={UNIT} />}
    >
      <Spacing mt={UNIT}>
        {actionType && (
          <ActionForm
            actionType={actionType}
            axis={actionPayload?.axis}
            features={columns.map(col => ({ uuid: col }))}
            onSave={() => saveAction(actionPayload)}
            payload={actionPayload}
            setPayload={setActionPayload}
          />
        )}

        <Spacing mt={5}>
          <Select
            // @ts-ignore
            compact
            onChange={e => setActionPayload(JSON.parse(e.target.value))}
            value={actionType}
            width={UNIT * 20}
          >
            <option value="">
              New action
            </option>

            {Object.entries(actionsConfig.rows).map(([k, v]) => (
              <option
                key={k}
                value={JSON.stringify({
                  action_type: k,
                  axis: 'row',
                })}
              >
                {v.title}
              </option>
            ))}

            {Object.entries(actionsConfig.columns).map(([k, v]) => v.multiColumns && (
              <option
                key={k}
                value={JSON.stringify({
                  action_type: k,
                  axis: 'column',
                })}
              >
                {v.title}
              </option>
            ))}
          </Select>
        </Spacing>
      </Spacing>

      <Spacing mt={UNIT} />
      {headEl}
      <Spacing mt={2} />
      <SuggestionsList
        featureSet={datasetResponse}
        featureSetId={slug}
      />
      <Spacing mt={4} />
      {tabsEl}
    </Layout>
  );
}

export default Data;
