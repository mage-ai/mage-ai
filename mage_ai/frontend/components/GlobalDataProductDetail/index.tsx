import NextLink from 'next/link';
import { toast } from 'react-toastify';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation } from 'react-query';
import { useRouter } from 'next/router';

import BlockType from '@interfaces/BlockType';
import Button from '@oracle/elements/Button';
import Checkbox from '@oracle/elements/Checkbox';
import Divider from '@oracle/elements/Divider';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import GlobalDataProductType, {
  GlobalDataProductObjectTypeEnum,
} from '@interfaces/GlobalDataProductType';
import Headline from '@oracle/elements/Headline';
import Link from '@oracle/elements/Link';
import PipelineRunsTable from '@components/PipelineDetail/Runs/Table';
import PipelineScheduleType from '@interfaces/PipelineScheduleType';
import PipelineType from '@interfaces/PipelineType';
import Select from '@oracle/elements/Inputs/Select';
import Spacing from '@oracle/elements/Spacing';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import TextInput from '@oracle/elements/Inputs/TextInput';
import TriggersTable from '@components/Triggers/Table';
import TripleLayout from '@components/TripleLayout';
import api from '@api';
import usePrevious from '@utils/usePrevious';
import { ButtonsStyle } from '@components/CustomTemplates/TemplateDetail/index.style';
import { PADDING_UNITS, UNITS_BETWEEN_ITEMS_IN_SECTIONS } from '@oracle/styles/units/spacing';
import { VERTICAL_NAVIGATION_WIDTH } from '@components/Dashboard/index.style';
import { capitalize, capitalizeRemoveUnderscoreLower } from '@utils/string';
import { onSuccess } from '@api/utils/response';
import { range } from '@utils/array';
import { useError } from '@context/Error';

type GlobalDataProductDetailProps = {
  globalDataProduct: GlobalDataProductType;
};

function GlobalDataProductDetail({
  globalDataProduct,
}: GlobalDataProductDetailProps) {
  const router = useRouter();
  const [showError] = useError(null, {}, [], {
    uuid: 'GlobalDataProductDetail',
  });

  const [beforeHidden, setBeforeHidden] = useState<boolean>(false);
  const [beforeWidth, setBeforeWidth] = useState<number>(600);
  const [touched, setTouched] = useState<boolean>(false);
  const [objectAttributes, setObjectAttributesState] =
    useState<GlobalDataProductType>(null);
  const setObjectAttributes = useCallback((handlePrevious) => {
    setTouched(true);
    setObjectAttributesState(handlePrevious);
  }, []);

  const objectPrev = usePrevious(globalDataProduct);
  useEffect(() => {
    if (objectPrev?.uuid !== globalDataProduct?.uuid) {
      setObjectAttributesState(globalDataProduct);
    }
  }, [globalDataProduct, objectPrev]);

  const buttonDisabled = useMemo(() => !objectAttributes?.uuid, [
    objectAttributes,
  ]);

  const [updateObject, { isLoading: isLoadingUpdateObject }] = useMutation(
    api.global_data_products.useUpdate(globalDataProduct?.uuid),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: ({
            global_data_product: gdp,
          }) => {
            if (globalDataProduct?.uuid && gdp?.uuid !== globalDataProduct?.uuid) {
              router.replace(
                '/global-data-products/[...slug]',
                `/global-data-products/${gdp?.uuid}`,
              );
            } else {
              setObjectAttributesState(gdp);
              setTouched(false);

              toast.success(
                'Global data product successfully saved.',
                {
                  position: toast.POSITION.BOTTOM_RIGHT,
                  toastId: 'custom_pipeline_template',
                },
              );
            }
          },
          onErrorCallback: (response, errors) => showError({
            errors,
            response,
          }),
        },
      ),
    },
  );

  const { data: dataPipeline } = api.pipelines.detail(
    GlobalDataProductObjectTypeEnum.PIPELINE === globalDataProduct?.object_type
      ? globalDataProduct?.object_uuid
      : null,
  );
  const pipeline: PipelineType = useMemo(() => dataPipeline?.pipeline, [dataPipeline]);
  const blocks: BlockType[] = useMemo(() => pipeline?.blocks || [], [pipeline]);

  const before = useMemo(() => (
    <FlexContainer
      flexDirection="column"
      fullHeight
    >
      <Flex flexDirection="column">
        <Spacing mt={UNITS_BETWEEN_ITEMS_IN_SECTIONS} px={PADDING_UNITS}>
          <Spacing mb={1}>
            <Text bold>
              UUID
            </Text>
            <Text muted small>
              Unique identifier for this global data product.
              This value must be unique across all global data products.
            </Text>
          </Spacing>

          <TextInput
            monospace
            // @ts-ignore
            onChange={e => setObjectAttributes(prev => ({
              ...prev,
              uuid: e.target.value,
            }))}
            placeholder="e.g. a unique identifier"
            primary
            setContentOnMount
            value={objectAttributes?.uuid || ''}
          />
        </Spacing>

        <Spacing mt={UNITS_BETWEEN_ITEMS_IN_SECTIONS} px={PADDING_UNITS}>
          <Spacing mb={1}>
            <Text bold>
              Object type
            </Text>
            <Text muted small>
              Pipeline, block, etc. Currently, only pipeline is supported.
            </Text>
          </Spacing>

          <Select
            onChange={e => setObjectAttributes(prev => ({
              ...prev,
              object_type: e.target.value,
            }))}
            primary
            value={objectAttributes?.object_type || ''}
          >
            {[
              GlobalDataProductObjectTypeEnum.PIPELINE,
            ].map(val => (
              <option key={val} value={val}>
                {capitalize(val)}
              </option>
            ))}
          </Select>
        </Spacing>

        <Spacing mt={UNITS_BETWEEN_ITEMS_IN_SECTIONS} px={PADDING_UNITS}>
          <Spacing mb={1}>
            <Text bold>
              Object UUID
            </Text>
            <Text muted small>
              The UUID of the {objectAttributes?.object_type || 'object type'} that this
              global data product represents.
            </Text>
          </Spacing>

          <TextInput
            monospace
            // @ts-ignore
            onChange={e => setObjectAttributes(prev => ({
              ...prev,
              object_uuid: e.target.value,
            }))}
            primary
            setContentOnMount
            value={objectAttributes?.object_uuid || ''}
          />

          {GlobalDataProductObjectTypeEnum.PIPELINE === objectAttributes?.object_type
            && objectAttributes?.object_uuid
            && (
              <Spacing mt={1}>
                <Text muted small>
                  View pipeline <NextLink
                    as={`/pipelines/${objectAttributes?.object_uuid}/edit`}
                    href={'/pipelines/[pipeline]/edit'}
                    passHref
                  >
                    <Link
                      bold
                      inline
                      monospace
                      openNewWindow
                      small
                    >
                      {objectAttributes?.object_uuid}
                    </Link>
                  </NextLink>.
                </Text>
              </Spacing>
          )}
        </Spacing>

        <Spacing mt={UNITS_BETWEEN_ITEMS_IN_SECTIONS} px={PADDING_UNITS}>
          <Spacing mb={1}>
            <Text bold>
              Outdated after
            </Text>
            <Text muted small>
              After the global data product successfully completes running,
              how long after that will the global data product be outdated?
            </Text>
          </Spacing>

          <Table
            columnFlex={[null, 1]}
            columns={[
              {
                uuid: 'Unit',
              },
              {
                uuid: 'Value',
              },
            ]}
            rows={[
              {
                uuid: 'seconds',
              },
              {
                uuid: 'weeks',
              },
              {
                uuid: 'months',
              },
              {
                uuid: 'years',
              },
            ].map(({
              uuid,
            }: {
              uuid: string;
            }) => [
              <Text default key={`label-${uuid}`} monospace>
                {uuid}
              </Text>,
              <TextInput
                compact
                key={`input-${uuid}`}
                monospace
                // @ts-ignore
                onChange={e => setObjectAttributes(prev => ({
                  ...prev,
                  outdated_after: {
                    ...prev?.outdated_after,
                    [uuid]: Number(e.target.value),
                  },
                }))}
                placeholder="Enter a number"
                primary
                setContentOnMount
                small
                type="number"
                value={objectAttributes?.outdated_after?.[uuid] || ''}
              />,
            ])}
          />
        </Spacing>

        <Spacing mt={UNITS_BETWEEN_ITEMS_IN_SECTIONS} px={PADDING_UNITS}>
          <Spacing mb={1}>
            <Text bold>
              Outdated starting at <Text inline muted>
                (optional)
              </Text>
            </Text>
            <Text muted small>
              If enough time has passed since the last global data product has ran successfully and
              the global data product is determined to be outdated, then you can configure it to be
              outdated at a specific date or time.
            </Text>

            <div style={{ marginTop: 4 }}>
              <Text muted small>
                For example, let’s say the global data product is outdated after 12 hours.
                The last successful run was yesterday at 18:00. The global data product will be
                outdated today at 06:00. However, if the <Text bold inline muted small>
                  Outdated starting at
                </Text> has a value of 17
                for <Text bold inline muted small>
                  Hour of day
                </Text>, then the global data product won’t run again until today at 17:00.
              </Text>
            </div>
          </Spacing>

          <Table
            columnFlex={[null, 1]}
            columns={[
              {
                uuid: 'Unit',
              },
              {
                uuid: 'Value',
              },
            ]}
            rows={[
              {
                uuid: 'second_of_minute',
                values: range(60).map((_, i) => ({
                  uuid: i,
                  value: i,
                })),
              },
              {
                uuid: 'minute_of_hour',
                values: range(60).map((_, i) => ({
                  uuid: i,
                  value: i,
                })),
              },
              {
                uuid: 'hour_of_day',
                values: range(24).map((_, i) => ({
                  uuid: i,
                  value: i,
                })),
              },
              {
                uuid: 'day_of_week',
                values: [
                  'Sunday',
                  'Monday',
                  'Tuesday',
                  'Wednesday',
                  'Thursday',
                  'Friday',
                  'Saturday',
                ].map((uuid, idx) => ({
                  uuid,
                  value: idx,
                })),
              },
              {
                uuid: 'day_of_month',
                values: range(31).map((_, i) => ({
                  uuid: i + 1,
                  value: i + 1,
                })),
              },
              {
                uuid: 'day_of_year',
                values: range(365).map((_, i) => ({
                  uuid: i + 1,
                  value: i + 1,
                })),
              },
              {
                uuid: 'week_of_month',
                values: range(5).map((_, i) => ({
                  uuid: i + 1,
                  value: i + 1,
                })),
              },
              {
                uuid: 'week_of_year',
                values: range(52).map((_, i) => ({
                  uuid: i + 1,
                  value: i + 1,
                })),
              },
              {
                uuid: 'month_of_year',
                values: [
                  'January',
                  'February',
                  'March',
                  'April',
                  'May',
                  'June',
                  'July',
                  'August',
                  'September',
                  'October',
                  'November',
                  'December',
                ].map((month, idx) => ({
                  uuid: month,
                  value: idx + 1,
                })),
              },
              // @ts-ignore
            ].map(({
              uuid,
              values,
            }: {
              uuid: string;
              values?: {
                uuid: string;
                value: number;
              };
            }) => {
              let inputEl;

              const sharedProps = {
                compact: true,
                key: `outdated-starting-at-input-${uuid}`,
                monospace: true,
                onChange: e => setObjectAttributes(prev => ({
                  ...prev,
                  outdated_starting_at: {
                    ...prev?.outdated_starting_at,
                    [uuid]: Number(e.target.value),
                  },
                })),
                primary: true,
                small: true,
                value: objectAttributes?.outdated_starting_at?.[uuid] || '',
              };

              if (values) {
                inputEl = (
                  <Select
                    {...sharedProps}
                    placeholder="Select a value"
                  >
                    {/* @ts-ignore */}
                    {values.map(({
                      uuid,
                      value,
                    }) => (
                      <option key={value} value={value}>
                        {uuid}
                      </option>
                    ))}
                  </Select>
                );
              } else {
                inputEl = (
                  <TextInput
                    {...sharedProps}
                    placeholder="Enter a number"
                    setContentOnMount
                    type="number"
                  />
                );
              }

              return [
                <Text default key={`outdated-starting-at-label-${uuid}`} monospace>
                  {capitalizeRemoveUnderscoreLower(uuid)}
                </Text>,
                inputEl,
              ];
            })}
          />
        </Spacing>

        {blocks?.length >= 1 && (
          <Spacing mt={UNITS_BETWEEN_ITEMS_IN_SECTIONS} px={PADDING_UNITS}>
            <Spacing mb={1}>
              <Text bold>
                Block data to output
              </Text>
              <Text muted small>
                The data output from the block(s) you select below will be the data product
                that is returned when a downstream entity is requesting data from this
                global data product.
              </Text>

              <div style={{ marginTop: 4 }}>
                <Text muted small>
                  When requesting data from this global data product,
                  the selected block(s) will return data from its most recent partition.
                  You can override this by adding a value in the partitions setting. For example,
                  if you set the partitions value to 5, then the selected block will return data
                  from its 5 most recent partitions. If you set the partitions value to 0, then
                  all the partitions will be returned.
                </Text>
              </div>
            </Spacing>

            <Table
              columnFlex={[null, 1, null]}
              columns={[
                {
                  label: () => '',
                  uuid: 'selected',
                },
                {
                  uuid: 'Block UUID',
                },
                {
                  uuid: 'Partitions',
                },
              ]}
              // @ts-ignore
              rows={blocks?.map(({
                uuid,
              }) => {
                const settings = objectAttributes?.settings;
                const blockSettings = settings?.[uuid];
                const selected = !!blockSettings;

                const setSelected = (value: boolean) => {
                  setObjectAttributes(prev => {
                    const settingsPrev = prev?.settings;

                    if (value) {
                      settingsPrev[uuid] = {};
                    } else {
                      delete settingsPrev?.[uuid];
                    }

                    return {
                      ...prev,
                      settings: settingsPrev,
                    };
                  });
                };

                return [
                  <Checkbox
                    checked={selected}
                    key={`selected--${uuid}`}
                    onClick={() => setSelected(!selected)}
                  />,
                  <NextLink
                    as={`/pipelines/${objectAttributes?.object_uuid}/edit?block_uuid=${uuid}`}
                    href={'/pipelines/[pipeline]/edit'}
                    key={`block-uuid-${uuid}`}
                    passHref
                  >
                    <Link
                      monospace
                      openNewWindow
                      sameColorAsText
                    >
                      {uuid}
                    </Link>
                  </NextLink>,
                  <TextInput
                    compact
                    key={`input-${uuid}`}
                    monospace
                    // @ts-ignore
                    onChange={e => setObjectAttributes(prev => ({
                      ...prev,
                      settings: {
                        ...prev?.settings,
                        [uuid]: {
                          ...prev?.settings?.[uuid],
                          partitions: Number(e.target.value),
                        },
                      },
                    }))}
                    placeholder="1"
                    primary
                    setContentOnMount
                    small
                    type="number"
                    value={objectAttributes?.settings?.[uuid]?.partitions || ''}
                  />,
                ];
              })}
            />
          </Spacing>
        )}
      </Flex>

      <ButtonsStyle>
        <Spacing p={PADDING_UNITS}>
          <FlexContainer>
            <Button
              disabled={buttonDisabled}
              fullWidth
              loading={isLoadingUpdateObject}
              // @ts-ignore
              onClick={() => updateObject({
                global_data_product: objectAttributes,
              })}
              primary
            >
              Save global data product
            </Button>
          </FlexContainer>
        </Spacing>
      </ButtonsStyle>
    </FlexContainer>
  ), [
    blocks,
    buttonDisabled,
    isLoadingUpdateObject,
    objectAttributes,
    setObjectAttributes,
    updateObject,
  ]);

  const {
    data: dataPipelineSchedules,
  } = api.pipeline_schedules.list(
    {
      global_data_product_uuid: globalDataProduct?.uuid,
    },
    {},
    {
      pauseFetch: !globalDataProduct?.uuid,
    },
  );
  const pipelineSchedules: PipelineScheduleType[] =
    useMemo(() => dataPipelineSchedules?.pipeline_schedules || [], [dataPipelineSchedules]);

  const {
    data: dataPipelineRuns,
  } = api.pipeline_runs.list(
    {
      global_data_product_uuid: globalDataProduct?.uuid,
    },
    {},
    {
      pauseFetch: !globalDataProduct?.uuid,
    },
  );
  const pipelineRuns = useMemo(() => dataPipelineRuns?.pipeline_runs || [], [dataPipelineRuns]);

  return (
    // @ts-ignore
    <TripleLayout
      before={before}
      beforeHeader={(
        <Spacing px={PADDING_UNITS}>
          <Text >
            Global data product attributes
          </Text>
        </Spacing>
      )}
      beforeHidden={beforeHidden}
      beforeWidth={beforeWidth}
      leftOffset={VERTICAL_NAVIGATION_WIDTH}
      setBeforeHidden={setBeforeHidden}
      setBeforeWidth={setBeforeWidth}
    >
      <Spacing p={PADDING_UNITS}>
        <Headline>
          Triggers
        </Headline>
      </Spacing>

      <Divider light />

      <TriggersTable
        disableActions
        pipeline={pipeline}
        pipelineSchedules={pipelineSchedules}
      />

      <Spacing p={PADDING_UNITS}>
        <Headline>
          Runs
        </Headline>
      </Spacing>

      <Divider light />

      <PipelineRunsTable
        hideTriggerColumn
        pipelineRuns={pipelineRuns}
      />
    </TripleLayout>
  );
}

export default GlobalDataProductDetail;
