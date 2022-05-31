import Router, { useRouter } from 'next/router';
import { useState } from 'react';

import Button from '@oracle/elements/Button';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Layout from '@oracle/components/Layout';
import SimpleDataTable from '@oracle/components/Table/SimpleDataTable';
import Spacing from '@oracle/elements/Spacing';
import Tabs, { Tab } from '@oracle/components/Tabs';
import Text from '@oracle/elements/Text';
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
  const featureMapping = getFeatureMapping(featureSet)
  const featureIndex = +featureId;

  // Get individual column data
  const featureData = featureMapping[featureIndex];
  const featureUUID = featureData?.uuid;
  const columnType = featureData?.column_type;
  const sampleRowData = featureSet?.sample_data?.rows?.map(row => ({
    columnValues: [row[featureIndex]],
  }));

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
        'Skewed', skew.toFixed(3),
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
        <Spacing mb={3} mt={3} />
        {dataEl}
      </Tab>
      <Tab  key="reports" label="Reports">
        <Spacing mb={3} mt={3} />
        {reportsEl}
      </Tab>
      <Tab key="visualizations" label="Visualizations"> </Tab>
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

export default Feature;
