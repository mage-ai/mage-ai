import NextLink from 'next/link';
import { ThemeContext } from 'styled-components';
import { useContext, useMemo, useState } from 'react';
import { useRouter } from 'next/router';

import api from '@api';
import GlobalHookType from '@interfaces/GlobalHookType';
import Link from '@oracle/elements/Link';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import { capitalizeRemoveUnderscoreLower, camelCaseToNormalWithSpaces } from '@utils/string';
import { getColorsForBlockType } from '@components/CodeBlock/index.style';
import { indexBy } from '@utils/array';
import { TEXT_PROPS_SHARED } from './index.style';
import { ThemeType } from '@oracle/styles/themes/constants';

function GlobalHooksList() {
  const themeContext: ThemeType = useContext(ThemeContext);
  const router = useRouter();

  const [selectedRowIndex, setSelectedRowIndex] = useState<number>(null);

  const { data } = api.global_hooks.list({
    _format: 'with_pipeline_details',
  });
  const globalHooks: GlobalHookType[] = useMemo(() => data?.global_hooks || [], [data]);

  return (
    <>
      <Table
        columnFlex={[null, null, null, null, 1]}
        columns={[
          {
            uuid: 'UUID',
          },
          {
            uuid: 'Resource',
          },
          {
            uuid: 'Operation',
          },
          {
            uuid: 'Pipeline',
          },
          {
            uuid: 'Outputs',
          },
        ]}
        onClickRow={(rowIndex: number, event?: any) => {
          // setSelectedRowIndex(prev => prev === rowIndex ? null : rowIndex);

          const globalHook = globalHooks?.[rowIndex];
          const {
            operation_type: operationType,
            resource_type: resourceType,
            uuid,
          } = globalHook;

          router.push(`/global-hooks/${uuid}?operation_type=${operationType}&resource_type=${resourceType}`)
        }}
        // renderExpandedRowWithObject={(rowIndex: number) => {
        //   const globalHook = globalHooks?.[rowIndex];

        //   return (
        //     <>
        //     </>
        //   );
        // }}
        getObjectAtRowIndex={(rowIndex: number) => globalHooks?.[rowIndex]}
        rows={globalHooks?.map((globalHook) => {
          const {
            operation_type: operationType,
            outputs,
            pipeline,
            pipeline_details: pipelineDetails,
            resource_type: resourceType,
            uuid,
          } = globalHook;
          const pipelineUUID = pipeline?.uuid;
          const pipelineEl = pipelineUUID
            ? (
              <NextLink
                as={`/pipelines/${pipelineUUID}/edit`}
                href={'/pipelines/[pipeline]/edit'}
                key="pipeline"
                passHref
              >
                <Link
                  {...TEXT_PROPS_SHARED}
                  openNewWindow
                >
                  {pipelineUUID}
                </Link>
              </NextLink>
            )
            : (
              <Text
                {...TEXT_PROPS_SHARED}
                key="pipeline"
                muted
              >
                -
              </Text>
            );

          const outputsEls = [];
          if (outputs?.length >= 1 && pipelineDetails?.blocks?.length >= 1) {
            const blocksMapping = indexBy(pipelineDetails?.blocks || [], ({ uuid }) => uuid);
            outputs?.forEach((output, idx) => {
              if (output?.block?.uuid) {
                const block = blocksMapping?.[output?.block?.uuid];
                if (block) {
                  if (idx >= 1) {
                    outputsEls.push(
                      <Text
                        {...TEXT_PROPS_SHARED}
                        inline
                        key={`${block?.uuid}-${idx}-comma`}
                        muted
                      >
                        ,&nbsp;
                      </Text>
                    );
                  }
                  outputsEls.push(
                    <NextLink
                      as={`/pipelines/${pipelineUUID}/edit?block_uuid=${block?.uuid}`}
                      href={'/pipelines/[pipeline]/edit'}
                      key={`${block?.uuid}-${idx}-link`}
                      passHref
                    >
                      <Link
                        {...TEXT_PROPS_SHARED}
                        inline
                        openNewWindow
                        sameColorAsText
                      >
                        <Text
                          {...TEXT_PROPS_SHARED}
                          color={getColorsForBlockType(
                            block?.type,
                            {
                              blockColor: block?.color,
                              theme: themeContext,
                            },
                          ).accent}
                          inline
                        >
                          {block?.uuid}
                        </Text>
                      </Link>
                    </NextLink>
                  );
                }
              }
            });
          }

          return [
            <Text
              {...TEXT_PROPS_SHARED}
              key="uuid"
            >
              {uuid}
            </Text>,
            <Text
              {...TEXT_PROPS_SHARED}
              key="resourceType"
              monospace={false}
            >
              {resourceType ? camelCaseToNormalWithSpaces(resourceType) : '-'}
            </Text>,
            <Text
              {...TEXT_PROPS_SHARED}
              key="operationType"
              monospace={false}
            >
              {operationType ? capitalizeRemoveUnderscoreLower(operationType) : '-'}
            </Text>,
            pipelineEl,
            <div key="outputs">
              {outputsEls?.length >= 1 && outputsEls}
              {!outputsEls?.length && (
                <Text
                  {...TEXT_PROPS_SHARED}
                  muted
                >
                  -
                </Text>
              )}
            </div>,
          ];
        })}
        selectedRowIndexInternal={selectedRowIndex}
        uuid="GlobalHooks/Table"
      />
    </>
  );
}

export default GlobalHooksList;
