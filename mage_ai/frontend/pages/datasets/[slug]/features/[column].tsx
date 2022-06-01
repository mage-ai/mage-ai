import Router, { useRouter } from 'next/router';
import { useState } from 'react';

import ActionForm from '@components/ActionForm';
import Button from '@oracle/elements/Button';
import ColumnAnalysis from '@components/datasets/Insights/ColumnAnalysis';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Layout from '@oracle/components/Layout';
import Select from "@oracle/elements/Inputs/Select";
import SimpleDataTable from '@oracle/components/Table/SimpleDataTable';
import Spacing from '@oracle/elements/Spacing';
import Tabs, { Tab } from '@oracle/components/Tabs';
import Text from '@oracle/elements/Text';
import actionsConfig from '@components/ActionForm/actions';
import api from 'api';
import { UNIT } from '@oracle/styles/units/spacing';
import { getFeatureMapping, getFeatureSetStatistics } from '@utils/models/featureSet';
import { getPercentage } from '@utils/number';

function Feature() {
  const router = useRouter();
  const {
    slug: featureSetId,
    column: featureId,
  } = router.query;

  const { data: featureSet } = api.feature_sets.detail(featureSetId);
  const features = Object.entries(featureSet?.metadata?.column_types || {})
    .map(([k, v]: [string, string]) => ({ columnType: v, uuid: k }));
  const featureMapping = getFeatureMapping(featureSet)
  const featureIndex = +featureId;

  // Get individual column data
  const featureData = featureMapping[featureIndex];
  const featureUUID = featureData?.uuid;
  const columnType = featureData?.column_type;
  const sampleRowData = featureSet?.sample_data?.rows?.map(row => ({
    columnValues: [row[featureIndex]],
  }));

  const insightsColumn = (featureSet?.['insights']?.[0] || []).find(({ feature }) => feature.uuid === featureUUID);
  const statisticsOverview = featureSet?.['statistics'] || {}

  // Get individual column statistics
  const featureSetStats = getFeatureSetStatistics(featureSet, featureUUID);
  const {
    completeness,
    count,
    count_distinct: countDistinct,
    invalid_value_count: invalidValueCount,
    null_value_count: nullValueCount,
    outlier_count: outlierCount,
    skew,
    validity,
  } = featureSetStats;
  const qualityMetrics = [
    {
      columnValues: [
        'Validity', getPercentage(validity),
      ],
    },
    {
      columnValues: [
        'Completeness', getPercentage(completeness),
      ],
    },
    {
      columnValues: [
        'Total values', count,
      ],
    },
    {
      columnValues: [
        'Unique values', countDistinct,
      ],
    },
    {
      columnValues: [
        'Missing values', nullValueCount,
      ],
    },
    {
      columnValues: [
        'Invalid values', invalidValueCount,
      ],
    },
  ];
  const warningMetrics = [
    {
      columnValues: [
        'Outliers', outlierCount,
      ],
    },
    {
      columnValues: [
        'Skewed', skew?.toFixed(3),
      ],
    },
  ];

  const [tab, setTab] = useState('data');
  const viewColumns = (e) => {
    e.preventDefault();
    Router.push('/datasets');
  };


  const headEl = (
    <FlexContainer alignItems="justify-right" flexDirection="row-reverse" >
      <Button
        onClick={viewColumns}
      >
        <Text bold> Datasets view </Text>
      </Button>
    </FlexContainer>
  );

  const columnValuesTableEl = (
    <SimpleDataTable
      columnFlexNumbers={[1, 1]}
      columnHeaders={[{ label: 'Column values' }]}
      rowGroupData={[{
        rowData: sampleRowData,
        title: `${featureUUID} (${columnType})`,
      }]}
    />
  )
  const metricsTableEl = (
    <SimpleDataTable
      columnFlexNumbers={[1, 1]}
      columnHeaders={[{ label: 'Column summary' }]}
      rowGroupData={[{
        rowData: qualityMetrics,
      }]}
    />
  );

  const warnEl = (
    <SimpleDataTable
      columnFlexNumbers={[1, 1]}
      columnHeaders={[{ label: 'Warnings' }]}
      rowGroupData={[{
        rowData: warningMetrics,
      }]}
    />
  );

  const dataEl = (
    <FlexContainer justifyContent={'center'}>
      <Flex flex={1}>
        {columnValuesTableEl}
      </Flex>
      <Spacing ml={UNIT} />
      <Flex flex={1}>
        {metricsTableEl}
      </Flex>
    </FlexContainer>
  );

  const visualizationEl = (
    <ColumnAnalysis
      column={featureUUID}
      features={features}
      insights={insightsColumn}
      statisticsByColumn={statisticsOverview[`${featureUUID}/value_counts`] || {}}
      statisticsOverview={statisticsOverview}
    />
  )

  // Metrics and Warnings
  const reportsEl = (
    <FlexContainer justifyContent={'center'}>
      <Flex flex={1}>
        {metricsTableEl}
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
      <Tab key="data" label="Data">
        <Spacing my={3} />
        {dataEl}
      </Tab>
      <Tab  key="reports" label="Reports">
        <Spacing my={3} />
        {reportsEl}
      </Tab>
      <Tab key="visualizations" label="Visualizations">
        <Spacing my={3} />
        {visualizationEl}
      </Tab>
    </Tabs>
  )

  const [actionPayload, setActionPayload] = useState({});
  const actionType = actionPayload?.action_type;
  const saveAction = (data) => {
    const updatedAction = {
      action_arguments: [
        featureUUID,
      ],
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
    >
      <Spacing mt={UNIT}>
        {actionType && (
          <ActionForm
            actionType={actionType}
            axis={actionPayload?.axis}
            currentFeature={{
              column_type: columnType,
              uuid: featureUUID,
            }}
            onSave={() => saveAction(actionPayload)}
            payload={actionPayload}
            setPayload={setActionPayload}
          />
        )}

        <Spacing mt={5}>
          <Select
            compact
            onChange={e => setActionPayload(JSON.parse(e.target.value))}
            value={actionType}
            width={UNIT * 20}
          >
            <option value="">
              New action
            </option>

            {Object.entries(actionsConfig.columns).map(([k, v]) => (
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
      <Spacing mt={UNIT} />
      {tabsEl}
    </Layout>
  );
}

export default Feature;
