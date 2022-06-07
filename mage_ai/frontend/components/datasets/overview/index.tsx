import React, { useCallback, useEffect, useState } from 'react';
import Router from 'next/router';
import { useMutation } from 'react-query';

import ActionDropdown from '@components/ActionForm/ActionDropdown';
import ActionForm from '@components/ActionForm';
import ActionPayloadType from '@interfaces/ActionPayloadType';
import BaseTable from '@oracle/components/Table/BaseTable';
import Button from '@oracle/elements/Button';
import ButtonGroup from '@oracle/elements/Button/ButtonGroup';
import ColumnListSidebar from '@components/datasets/columns/ColumnListSidebar';
import Divider from '@oracle/elements/Divider';
import FeatureProfiles from '@components/datasets/FeatureProfiles';
import FeatureSetType from '@interfaces/FeatureSetType';
import FeatureType, { ColumnTypeEnum, FeatureResponseType } from '@interfaces/FeatureType';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Layout from '@oracle/components/Layout';
import Link from '@oracle/elements/Link';
import MultiColumn from '@oracle/components/Layout/MultiColumn';
import Overview from '@components/datasets/Insights/Overview';
import PageBreadcrumbs from '@components/PageBreadcrumbs';
import SimpleDataTable from '@oracle/components/Table/SimpleDataTable';
import Spacing from '@oracle/elements/Spacing';
import Suggestions from '@components/suggestions';
import Text from '@oracle/elements/Text';
import TransformerActionType from '@interfaces/TransformerActionType';
import api from '@api';
import { Column as ColumnIcon } from '@oracle/icons';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { capitalize } from '@utils/string';
import {
  createMetricsSample,
  createStatisticsSample,
} from './utils';
import { deserializeFeatureSet } from '@utils/models/featureSet';
import { goToWithQuery } from '@utils/routing';
import { onSuccess } from '@api/utils/response';
import { queryFromUrl } from '@utils/url';
import { removeAtIndex } from '@utils/array';

const TAB_REPORTS = 'Reports';
const TAB_VISUALIZATIONS = 'Visualizations';
const TAB_DATA = 'Data';
const TABS_IN_ORDER = [
  TAB_REPORTS,
  TAB_VISUALIZATIONS,
  TAB_DATA,
];

type DatasetOverviewProps = {
  featureSet: FeatureSetType;
  fetchFeatureSet: (arg: any) => void;
};

function DatasetOverview({
  featureSet: featureSetRaw,
  fetchFeatureSet,
}: DatasetOverviewProps) {
  const [errorMessages, setErrorMessages] = useState(null);
  const qFromUrl = queryFromUrl();
  const {
    column: columnFromUrl,
    show_columns: showColumnsFromUrl,
  } = qFromUrl;
  const tabsFromUrlInit = qFromUrl['tabs[]'];
  const tabsFromUrl = tabsFromUrlInit
    ? Array.isArray(tabsFromUrlInit) ? tabsFromUrlInit : [tabsFromUrlInit]
    : [];

  const setTabs = useCallback((newTab: string) => {
    goToWithQuery({
      'tabs[]': newTab,
    });
  }, [tabsFromUrl]);

  useEffect(() => {
    if (tabsFromUrl.length === 0) {
      // @ts-ignore
      setTabs(TAB_REPORTS);
    }
  }, [setTabs, tabsFromUrl]);

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
  const featuresWithAltColType: FeatureResponseType[] = features.map(({ columnType, uuid }) => ({
    column_type: columnType,
    uuid,
  }));

  const columnHeaderSample = columns?.map((header:any) => ({
    label: header,
  }));
  const metricSample = statistics ? createMetricsSample(statistics, columnTypes) : null;
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
          onErrorCallback: ({
            error: {
              errors,
              message,
            },
          }) => {
            const arr = [];
            if (message) {
              arr.push(...message.split('\n'));
            }
            if (errors) {
              arr.push(...errors);
            }
            if (arr.length >= 1) {
              setErrorMessages(arr);
            }
          },
        },
      ),
    },
  );
  const saveAction = (newActionData: TransformerActionType) => {
    setErrorMessages(null);
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

    setErrorMessages(null);
    commitAction({
      ...pipeline,
      actions: removeAtIndex(pipelineActions, idx),
    });
  };

  const closeAction = () => setActionPayload({} as ActionPayloadType);

  const selectActionEl = (
    <ActionDropdown
      actionType={actionType}
      setActionPayload={setActionPayload}
    />
  );

  const columnsVisible = Number(showColumnsFromUrl) === 1;

  return (
    <Layout
      centerAlign
      footer={<Spacing mt={UNIT} />}
      fullWidth
      pageTitle={metadata?.name || 'Dataset Overview'}
    >
      <MultiColumn
        after={
          <Spacing p={PADDING_UNITS}>
            <Spacing mb={PADDING_UNITS}>
              {selectActionEl}
            </Spacing>

            {actionType && (
              <Spacing mb={PADDING_UNITS}>
                <ActionForm
                  actionType={actionType}
                  axis={actionPayload?.axis}
                  features={featuresWithAltColType}
                  onClose={closeAction}
                  onSave={() => {
                    saveAction({
                      action_payload: {
                        ...actionPayload,
                        action_type: actionType,
                      },
                    });
                    closeAction();
                  }}
                  payload={actionPayload}
                  setPayload={setActionPayload}
                />
              </Spacing>
            )}

            {errorMessages?.length >= 1 && (
              <Spacing mb={PADDING_UNITS}>
                <Text bold>
                  Errors
                </Text>
                {errorMessages?.map((msg: string) => (
                  <Text key={msg} monospace xsmall>
                    {msg}
                  </Text>
                ))}
              </Spacing>
            )}

            {featureSet && (
              <Suggestions
                addAction={saveAction}
                featureSet={featureSet}
                removeAction={removeAction}
                removeSuggestion={(action) => console.log(action)}
              />
            )}
          </Spacing>
        }
        before={columnsVisible && (
          <Spacing mt={PADDING_UNITS}>
            <ColumnListSidebar
              featureSet={featureSet}
              onClickColumn={col => goToWithQuery({ column: col })}
              selectedColumn={columnFromUrl}
            />
          </Spacing>
        )}
        header={
          <Spacing p={PADDING_UNITS}>
            <Spacing mb={2}>
              <Link
                block
                noHoverUnderline
                noOutline
                onClick={() => goToWithQuery({
                  show_columns: columnsVisible ? 0 : 1,
                })}
                preventDefault
              >
                <FlexContainer alignItems="center">
                  <ColumnIcon
                    primary={!columnsVisible}
                    size={UNIT * 2}
                  />

                  <Spacing mr={1} />

                  <Text bold primary={!columnsVisible}>
                    {columnsVisible ? 'Hide columns' : 'Show columns'}
                  </Text>
                </FlexContainer>
              </Link>
            </Spacing>

            <PageBreadcrumbs featureSet={featureSet} />
          </Spacing>
        }
        onTabClick={t => setTabs(t)}
        selectedTab={tabsFromUrl?.[0]}
        tabs={TABS_IN_ORDER}
      >
        <Spacing p={PADDING_UNITS}>
          {tabsFromUrl?.includes(TAB_REPORTS) && (
            <>
              <FlexContainer justifyContent={'center'}>
                <Flex flex={1}>
                  {metricSample && (
                    <SimpleDataTable
                      columnFlexNumbers={[2, 1, 2 ]}
                      columnHeaders={[{ label: 'Quality Metrics' }]}
                      rowGroupData={[metricSample]}
                    />
                  )}
                </Flex>

                <Spacing ml={PADDING_UNITS} />

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

              <Spacing mt={PADDING_UNITS}>
                <FeatureProfiles
                  features={features}
                  featureSet={featureSet}
                  statistics={statistics}
                />
              </Spacing>
            </>
          )}

          {tabsFromUrl?.includes(TAB_VISUALIZATIONS) && (
            <Overview
              features={features}
              insightsOverview={insightsOverview}
              statistics={statistics}
            />
          )}

          {tabsFromUrl?.includes(TAB_DATA) && (
            <BaseTable
              columns={columnHeaderSample}
              data={rows}
              datatype={headerTypes}
              titles={columns}
            />
          )}
        </Spacing>
      </MultiColumn>
    </Layout>
  );
}

export default DatasetOverview;
