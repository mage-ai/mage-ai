import { useMemo } from 'react';

import BlocksStackedGradient from '@oracle/icons/custom/BlocksStackedGradient';
import Dashboard from '@components/Dashboard';
import FlexContainer from '@oracle/components/FlexContainer';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import PipelineType from '@interfaces/PipelineType';
import ScheduleGradient from '@oracle/icons/custom/ScheduleGradient';
import api from '@api';
import {
  BlocksStacked,
  Edit,
  Schedule,
} from '@oracle/icons';
import { BreadcrumbType } from '@components/shared/Header';
import { BUTTON_GRADIENT } from '@oracle/styles/colors/gradients';
import { PageNameEnum } from './constants';
import { PURPLE_BLUE } from '@oracle/styles/colors/gradients';
import { UNIT } from '@oracle/styles/units/spacing';

type PipelineDetailPageProps = {
  breadcrumbs: BreadcrumbType[];
  children: any;
  pageName: PageNameEnum,
  pipeline: {
    uuid: string;
  };
  subheaderChildren?: any;
  title?: (pipeline: PipelineType) => string;
};

function PipelineDetailPage({
  breadcrumbs: breadcrumbsProp,
  children,
  pageName,
  pipeline: pipelineProp,
  subheaderChildren,
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
          id: 'schedules',
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
          id: 'runs',
          label: () => 'Runs',
          linkProps: {
            as: `/pipelines/${pipelineUUID}/runs`,
            href: '/pipelines/[pipeline]/runs',
          },
          isSelected: () => PageNameEnum.RUNS === pageName,
        },
      ]}
      subheaderChildren={
        <FlexContainer alignItems="center">
          <KeyboardShortcutButton
            background={BUTTON_GRADIENT}
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

          {subheaderChildren}
        </FlexContainer>
      }
      title={pipeline ? (title ? title(pipeline) : pipeline.name) : null}
    >
      {children}
    </Dashboard>
  );
}

export default PipelineDetailPage;
