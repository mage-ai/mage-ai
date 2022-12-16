import React from 'react';
import { useRouter } from 'next/router';

import Headline from '@oracle/elements/Headline';
import PipelineDetailPage from '@components/PipelineDetailPage';
import PipelineType from '@interfaces/PipelineType';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import { BeforeStyle } from '@components/PipelineDetail/shared/index.style';
import { BreadcrumbType } from '@components/shared/Header';
import { LinkStyle } from './index.style';
import { MonitorTypeEnum } from './constants';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';
import { PageNameEnum } from '@components/PipelineDetailPage/constants';

type MonitorProps = {
  breadcrumbs: BreadcrumbType[];
  children: any;
  monitorType: MonitorTypeEnum;
  pipeline: PipelineType;
  subheader?: any;
};

function Monitor({
  breadcrumbs,
  children,
  monitorType,
  pipeline,
  subheader,
}: MonitorProps) {
  const router = useRouter();

  return (
    <PipelineDetailPage
      before={
        <BeforeStyle>
          <Spacing p={PADDING_UNITS}>
            <Headline
              level={4}
              muted
            >
              Insights
            </Headline>
          </Spacing>
          <LinkStyle
            onClick={(e) => {
              e.preventDefault();

              router.push(
                '/pipelines/[pipeline]/monitors',
                `/pipelines/${pipeline?.uuid}/monitors`,
              )
            }}
            selected={MonitorTypeEnum.PIPELINE_RUNS == monitorType}
          >
            <Text>
              Pipeline runs
            </Text>
          </LinkStyle>
          <LinkStyle
            onClick={(e) => {
              e.preventDefault();

              router.push(
                '/pipelines/[pipeline]/monitors/block-runs',
                `/pipelines/${pipeline?.uuid}/monitors/block-runs`,
              )
            }}
            selected={MonitorTypeEnum.BLOCK_RUNS == monitorType}
          >
            <Text>
              Block runs
            </Text>
          </LinkStyle>
          <LinkStyle
            onClick={(e) => {
              e.preventDefault();

              router.push(
                '/pipelines/[pipeline]/monitors/block-runtime',
                `/pipelines/${pipeline?.uuid}/monitors/block-runtime`,
              )
            }}
            selected={MonitorTypeEnum.BLOCK_RUNTIME == monitorType}
          >
            <Text>
              Block runtime
            </Text>
          </LinkStyle>
        </BeforeStyle>
      }
      breadcrumbs={breadcrumbs}
      pageName={PageNameEnum.MONITOR}
      pipeline={pipeline}
      subheader={subheader}
      uuid="pipeline/monitor"
    >
      {children}
    </PipelineDetailPage>
  );
}

export default Monitor;
