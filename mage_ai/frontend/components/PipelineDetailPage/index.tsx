import { useMemo } from 'react';

import BlocksStackedGradient from '@oracle/icons/custom/BlocksStackedGradient';
import Dashboard from '@components/Dashboard';
import Divider from '@oracle/elements/Divider';
import FlexContainer from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import PipelineType from '@interfaces/PipelineType';
import ScheduleGradient from '@oracle/icons/custom/ScheduleGradient';
import Spacing from '@oracle/elements/Spacing';
import api from '@api';
import {
  BlocksStacked,
  Edit,
  Schedule,
} from '@oracle/icons';
import { BannerStyle } from './index.style';
import { BreadcrumbType } from '@components/shared/Header';
import { PageNameEnum } from './constants';
import { PURPLE_BLUE } from '@oracle/styles/colors/gradients';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';

type PipelineDetailPageProps = {
  breadcrumbs: BreadcrumbType[];
  children: any;
  headline?: string;
  pageName: PageNameEnum,
  pipeline: {
    uuid: string;
  };
  subheaderBackground?: string;
  subheaderButton?: any;
  subheaderText?: any;
  title?: (pipeline: PipelineType) => string;
};

function PipelineDetailPage({
  breadcrumbs: breadcrumbsProp,
  children,
  headline,
  pageName,
  pipeline: pipelineProp,
  subheaderBackground,
  subheaderButton,
  subheaderText,
  title,
}: PipelineDetailPageProps) {
  const pipelineUUID = pipelineProp.uuid;
  const { data } = api.pipelines.detail(pipelineUUID);
  const pipeline = data?.pipeline;

  const breadcrumbs = useMemo(() => {
    const arr = [];

    if (pipeline) {
      arr.push(...[
        {
          label: () => 'Pipelines',
          linkProps: {
            href: '/pipelines',
          },
        },
      ]);

      if (breadcrumbsProp) {
        arr.push({
          label: () => pipeline.name,
          linkProps: {
            as: `/pipelines/${pipelineUUID}/schedules`,
            href: '/pipelines/[pipeline]/schedules',
          },
        });
        arr.push(...breadcrumbsProp);

        if (!arr[arr.length - 1].gradientColor) {
          arr[arr.length - 1].gradientColor = PURPLE_BLUE;
        }
      } else {
        arr.push({
          gradientColor: PURPLE_BLUE,
          label: () => pipeline.name,
        });
      }
    }

    return arr;
  }, [
    breadcrumbsProp,
    pipeline,
  ]);

  return (
    <Dashboard
      breadcrumbs={breadcrumbs}
      navigationItems={[
        {
          Icon: Schedule,
          IconSelected: ScheduleGradient,
          id: PageNameEnum.SCHEDULES,
          label: () => 'Schedules',
          linkProps: {
            as: `/pipelines/${pipelineUUID}/schedules`,
            href: '/pipelines/[pipeline]/schedules',
          },
          isSelected: () => PageNameEnum.SCHEDULES === pageName,
        },
        {
          Icon: BlocksStacked,
          IconSelected: BlocksStackedGradient,
          id: PageNameEnum.PIPELINE_RUNS,
          label: () => 'Pipeline runs',
          linkProps: {
            as: `/pipelines/${pipelineUUID}/pipeline-runs`,
            href: '/pipelines/[pipeline]/pipeline-runs',
          },
          isSelected: () => PageNameEnum.PIPELINE_RUNS === pageName,
        },
        {
          Icon: BlocksStacked,
          IconSelected: BlocksStackedGradient,
          id: PageNameEnum.BLOCK_RUNS,
          label: () => 'Block runs',
          linkProps: {
            as: `/pipelines/${pipelineUUID}/block-runs`,
            href: '/pipelines/[pipeline]/block-runs',
          },
          isSelected: () => PageNameEnum.BLOCK_RUNS === pageName,
        },
      ]}
      subheaderChildren={
        <FlexContainer alignItems="center">
          <KeyboardShortcutButton
            blackBorder
            bold
            beforeElement={<Edit size={2.5 * UNIT} />}
            inline
            linkProps={{
              as: `/pipelines/${pipelineUUID}/edit`,
              href: '/pipelines/[pipeline]/edit',
            }}
            noHoverUnderline
            sameColorAsText
            uuid="PipelineDetailPage/edit"
          >
            Edit Pipeline
          </KeyboardShortcutButton>
        </FlexContainer>
      }
      title={pipeline ? (title ? title(pipeline) : pipeline.name) : null}
    >
      {(subheaderButton || subheaderText) && (
        <Spacing mb={PADDING_UNITS} mx={PADDING_UNITS}>
          <BannerStyle background={subheaderBackground}>
            <FlexContainer alignItems="center">
              {subheaderButton}
              {subheaderText && <Spacing ml={3} />}
              {subheaderText}
            </FlexContainer>
          </BannerStyle>
        </Spacing>
      )}

      {headline && (
        <Spacing p={PADDING_UNITS}>
          <Spacing mt={PADDING_UNITS} px={PADDING_UNITS}>
            <Headline level={5}>
              {headline}
            </Headline>
            <Divider light mt={PADDING_UNITS} short />
          </Spacing>
        </Spacing>
      )}

      {children}
    </Dashboard>
  );
}

export default PipelineDetailPage;
