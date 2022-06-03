import React, { useState } from 'react';
import Router from 'next/router';
import { useMutation } from 'react-query';

import ActionForm from '@components/ActionForm';
import ActionPayloadType from '@interfaces/ActionPayloadType';
import BaseTable from '@oracle/components/Table/BaseTable';
import Button from '@oracle/elements/Button';
import FeatureProfiles from '@components/datasets/FeatureProfiles';
import FeatureSetType from '@interfaces/FeatureSetType';
import FeatureType, { ColumnTypeEnum } from '@interfaces/FeatureType';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Layout from '@oracle/components/Layout';
import Overview from '@components/datasets/Insights/Overview';
import PageBreadcrumbs from '@components/PageBreadcrumbs';
import Select from '@oracle/elements/Inputs/Select';
import SimpleDataTable from '@oracle/components/Table/SimpleDataTable';
import Spacing from '@oracle/elements/Spacing';
import Suggestions from '@components/suggestions';
import Tabs, { Tab } from '@oracle/components/Tabs';
import Text from '@oracle/elements/Text';
import TransformerActionType from '@interfaces/TransformerActionType';
import actionsConfig from '@components/ActionForm/actions';
import api from '@api';
import { UNIT } from '@oracle/styles/units/spacing';
import {
  createMetricsSample,
  createStatisticsSample,
} from './utils';
import { deserializeFeatureSet } from '@utils/models/featureSet';
import { goToWithQuery } from '@utils/routing';
import { onSuccess } from '@api/utils/response';
import { queryFromUrl } from '@utils/url';
import { removeAtIndex } from '@utils/array';

type DatasetOverviewProps = {
  featureSet: FeatureSetType;
  fetchFeatureSet: (arg: any) => void;
};

function DatasetOverview({
  featureSet: featureSetRaw,
  fetchFeatureSet,
}: DatasetOverviewProps) {
  const { tab: tabFromUrl } = queryFromUrl();
  const currentTab = tabFromUrl || 'reports';

  const featureSet = featureSetRaw ? deserializeFeatureSet(featureSetRaw) : {};
  const {
    metadata,
    pipeline,
    statistics,
  } = featureSet || {};
  const pipelineActions = Array.isArray(pipeline?.actions) ? pipeline?.actions : [];

  const {
    columns,
    rows,
  } = featureSet?.sample_data || {};
  const {
    column_types: columnTypes,
  } = metadata || {};
  const {
    header_types: headerTypes,
  } = featureSet?.metadata?.column_types || {};
  const features: FeatureType[] = Object.entries(featureSet?.metadata?.column_types || {})
    .map(([k, v]: [string, ColumnTypeEnum]) => ({ columnType: v, uuid: k }));

  const columnHeaderSample = columns?.map((header:any) => ({
    label: header,
  }));
  const metricSample = statistics ? createMetricsSample(statistics) : null;
  const statSample = (statistics && columnTypes) ? createStatisticsSample(statistics, columnTypes) : null;

  const setTab = (newTab: string) => {
    goToWithQuery({
      tab: newTab,
    });
  };

  const viewColumns = (e) => {
    const pathname = window?.location?.pathname;
    e.preventDefault();
    Router.push(`${pathname}/features`);
  };

  const headEl = (
    <FlexContainer alignItems="center" justifyContent="space-between">
      <PageBreadcrumbs featureSet={featureSet} />
      <Button onClick={viewColumns}>
        <Text bold> Column view </Text>
      </Button>
    </FlexContainer>
  );

  const insightsOverview = featureSet?.['insights']?.[1] || {};

  const [actionPayload, setActionPayload] = useState<ActionPayloadType>();
  const actionType = actionPayload?.action_type;

  const [commitAction, { isLoading: isLoadingCommitAction }] = useMutation(
    api.pipelines.useUpdate(pipeline?.id),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: (response) => fetchFeatureSet({
            ...featureSet,
            pipeline: response,
          }),
        },
      ),
    },
  );
  const saveAction = (newActionData: TransformerActionType) => {
    commitAction({
      ...pipeline,
      actions: [
        ...pipelineActions,
        newActionData,
      ],
    });
  };
  const removeAction = (existingActionData: TransformerActionType) => {
    const idx =
      pipelineActions.findIndex(({ id }: TransformerActionType) => id === existingActionData.id);

    commitAction({
      ...pipeline,
      actions: removeAtIndex(pipelineActions, idx),
    });
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
            features={features}
            onSave={() => saveAction({
              action_payload: {
                ...actionPayload,
                action_type: actionType,
              },
            })}
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

      {featureSet && (
        <Suggestions
          addAction={saveAction}
          featureSet={featureSet}
          removeAction={removeAction}
          removeSuggestion={(action) => console.log(action)}
        />
      )}

      <Spacing mt={4} />
      <Tabs
        bold
        currentTab={currentTab}
        large
        noBottomBorder={false}
        onChange={key => setTab(key)}
      >
        <Tab key="data" label="Data">
          <Spacing mb={3} mt={3} />
          <BaseTable
            columns={columnHeaderSample}
            data={rows}
            datatype={headerTypes}
            titles={columns}
          />
        </Tab>
        <Tab key="reports" label="Reports">
          <Spacing mb={3} mt={3} />
          <FlexContainer justifyContent={'center'}>
            <Flex flex={1}>
              {metricSample && (
                <SimpleDataTable
                  columnFlexNumbers={[1, 1]}
                  columnHeaders={[{ label: 'Quality Metrics' }]}
                  rowGroupData={[metricSample]}
                />
              )}
            </Flex>
            <Spacing ml={8} />
            <Flex flex={1}>
              {statSample && (
                <SimpleDataTable
                  columnFlexNumbers={[1, 1, 1]}
                  columnHeaders={[{ label: 'Statistics' }]}
                  rowGroupData={[statSample]}
                />
              )}
            </Flex>
          </FlexContainer>
          <Spacing mt={8}>
            <FeatureProfiles
              features={features}
              featureSet={featureSet}
              statistics={statistics}
            />
          </Spacing>
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
    </Layout>
  );
}

export default DatasetOverview;
