import Router, { useRouter } from 'next/router';
import { useState } from 'react';

import ActionForm from '@components/ActionForm';
import ActionPayloadType from '@interfaces/ActionPayloadType';
import Button from '@oracle/elements/Button';
import ColumnAnalysis from '@components/datasets/Insights/ColumnAnalysis';
import FeatureSetType from '@interfaces/FeatureSetType';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Layout from '@oracle/components/Layout';
import PageBreadcrumbs from '@components/PageBreadcrumbs';
import Panel from '@oracle/components/Panel';
import Select from '@oracle/elements/Inputs/Select';
import SimpleDataTable from '@oracle/components/Table/SimpleDataTable';
import Spacing from '@oracle/elements/Spacing';
import Tabs, { Tab } from '@oracle/components/Tabs';
import Text from '@oracle/elements/Text';
import actionsConfig from '@components/ActionForm/actions';
import api from 'api';
import { UNIT } from '@oracle/styles/units/spacing';
import { getFeatureMapping, getFeatureSetStatistics } from '@utils/models/featureSet';
import { getPercentage } from '@utils/number';

function Feature({
  featureSetId,
  featureId,
}) {
  const { data: featureSet }: { data: FeatureSetType } = api.feature_sets.detail(featureSetId);
  const features = Object.entries(featureSet?.metadata?.column_types || {})
    .map(([k, v]) => ({ columnType: v, uuid: k }));
  const featureMapping = getFeatureMapping(featureSet);
  const featureIndex = +featureId;

  // Get individual column data
  const featureData = featureMapping[featureIndex];
  const featureUUID = featureData?.uuid;
  const columnType = featureData?.column_type;
  const sampleRowData = featureSet?.sample_data?.rows?.map(row => ({
    columnValues: [row[featureIndex]],
  }));

  const insightsColumn = (featureSet?.insights?.[0] || []).find(({ feature }) => feature.uuid === featureUUID);
  const statisticsOverview = featureSet?.['statistics'] || {};

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
  const qualityMetrics: {
    columnValues: (string | number | any)[];
    uuid?: string | number;
  }[] = [
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
  const noWarningMetrics = warningMetrics.every(
    ({ columnValues }) => (typeof columnValues[1] === 'undefined'),
  );

  const [tab, setTab] = useState('data');
  const viewColumns = (e) => {
    e.preventDefault();
    Router.push('/datasets');
  };

  const headEl = (
    <FlexContainer alignItems="center" justifyContent="space-between">
      <PageBreadcrumbs featureSet={featureSet} />
      <Button onClick={viewColumns}>
        <Text bold> Datasets view </Text>
      </Button>
    </FlexContainer>
  );

  const metricsTableEl = (
    <SimpleDataTable
      columnFlexNumbers={[1, 1]}
      columnHeaders={[{ label: 'Column summary' }]}
      rowGroupData={[{
        rowData: qualityMetrics,
      }]}
    />
  );

  const dataEl = (
    <FlexContainer justifyContent={'center'}>
      <Flex flex={1}>
        <SimpleDataTable
          columnFlexNumbers={[1, 1]}
          columnHeaders={[{ label: 'Column values' }]}
          rowGroupData={[{
            rowData: sampleRowData,
            title: `${featureUUID} (${columnType})`,
          }]}
        />
      </Flex>
      <Spacing ml={UNIT} />
      <Flex flex={1}>
        {metricsTableEl}
      </Flex>
    </FlexContainer>
  );

  const reportsEl = (
    <FlexContainer justifyContent={'center'}>
      <Flex flex={1}>
        {metricsTableEl}
      </Flex>
      <Spacing ml={UNIT} />
      <Flex flex={1}>
        {noWarningMetrics
          ?
            <Panel fullHeight={false} headerTitle="Warnings">
              <Text>There are no warnings.</Text>
            </Panel>
          :
            <SimpleDataTable
              columnFlexNumbers={[1, 1]}
              columnHeaders={[{ label: 'Warnings' }]}
              rowGroupData={[{
                rowData: warningMetrics,
              }]}
            />
        }
      </Flex>
    </FlexContainer>
  );

  const tabsEl = (
    <Tabs
      bold
      defaultKey={tab}
      large
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
        <ColumnAnalysis
          column={featureUUID}
          features={features}
          insights={insightsColumn}
          statisticsByColumn={statisticsOverview[`${featureUUID}/value_counts`] || {}}
          statisticsOverview={statisticsOverview}
        />
      </Tab>
    </Tabs>
  );

  const [actionPayload, setActionPayload] = useState<ActionPayloadType>();
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
              columnType: columnType,
              uuid: featureUUID,
            }}
            onSave={() => saveAction(actionPayload)}
            payload={actionPayload}
            setPayload={setActionPayload}
          />
        )}

        <Spacing mt={5}>
          <Select
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
      <Spacing mt={2} />

      <Spacing mt={4} />
      {tabsEl}
    </Layout>
  );
}

export default Feature;
