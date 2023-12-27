import { BlockTypeEnum } from '@interfaces/BlockType';
import {
  CommandCenterActionInteractionTypeEnum,
  CommandCenterItemType,
  CommandCenterTypeEnum,
} from '@interfaces/CommandCenterType';
import { FileExtensionEnum } from '@interfaces/FileType';
import { OperationTypeEnum } from '@interfaces/PageComponentType';

export const ITEMS: CommandCenterItemType[] = [
  {
    description: 'Configure your project.',
    title: 'Open project settings',
    type: CommandCenterTypeEnum.APPLICATION,
    actions: [
      {
        page: {
          path: '/settings/account/profile',
        },
      },
      {
        delay: 3000,
        page: {
          path: '/settings/workspace/preferences',
        },
      },
      {
        delay: 3000,
        interaction: {
          element: {
            id: 'save-project-settings',
          },
          type: CommandCenterActionInteractionTypeEnum.CLICK,
        },
      },
    ],
  },
  {
    description: 'Personalize your profile.',
    title: 'Edit profile',
    type: CommandCenterTypeEnum.APPLICATION,
    actions: [
      {
        page: {
          path: '/settings/account/profile',
          openNewWindow: true,
        },
      },
    ],
  },
  {
    description: 'Technical documentation for Mage.',
    title: 'Read developer documentation',
    type: CommandCenterTypeEnum.APPLICATION,
    actions: [
      {
        page: {
          external: true,
          path: 'https://docs.mage.ai',
        },
      },
    ],
  },
  {
    description: 'Learn best practices, share code snippets, and have fun.',
    title: 'Get instant live support',
    type: CommandCenterTypeEnum.APPLICATION,
    actions: [
      {
        page: {
          external: true,
          path: 'https://mage.ai/chat',
          openNewWindow: true,
        },
      },
    ],
  },
  {
    title: 'Daily run',
    description: 'Trigger for Build core data users pipeline.',
    type: CommandCenterTypeEnum.TRIGGER,
    actions: [
      {
        request: {
          operation: OperationTypeEnum.CREATE,
          payload: {
            name: 'test1',
            schedule_interval: '@once',
            schedule_type: 'time',
            start_time: '2023-12-25 21:14',
            status: 'active',
            variables: {},
          },
          payload_resource_key: 'pipeline_schedule',
          query: {},
          resource: 'pipeline_schedules',
          resource_id: null,
          resource_parent: 'pipelines',
          resource_parent_id: 'humble_star',
          response_resource_key: 'pipeline_schedule',
        },
      },
    ],
  },
  {
    title: 'Blocks for pipeline',
    description: 'View details of blocks in pipeline beautiful_prophecy.',
    type: CommandCenterTypeEnum.PIPELINE,
    actions: [
      {
        request: {
          operation: OperationTypeEnum.DETAIL,
          payload_resource_key: 'pipeline',
          query: {},
          resource: 'pipelines',
          resource_id: 'beautiful_prophecy',
          response_resource_key: 'pipeline',
        },
      },
    ],
  },
  {
    title: 'Triggers for pipeline',
    description: 'View all triggers for pipeline humble_star.',
    type: CommandCenterTypeEnum.PIPELINE,
    actions: [
      {
        request: {
          operation: OperationTypeEnum.LIST,
          resource: 'pipeline_schedules',
          resource_parent: 'pipelines',
          resource_parent_id: 'humble_star',
          response_resource_key: 'pipeline_schedules',
        },
      },
    ],
  },
  {
    title: 'Generate code',
    description: 'Use AI to create code.',
    type: CommandCenterTypeEnum.ACTION,
  },
  {
    title: 'Load titanic',
    description: 'Python data loader block.',
    metadata: {
      block: {
        type: BlockTypeEnum.DATA_LOADER,
      },
    },
    type: CommandCenterTypeEnum.BLOCK,
  },
  {
    title: 'Open file my_first_dbt_model.py',
    description: 'default_repo/dbt/demo/models/example/my_first_dbt_model.sql',
    metadata: {
      file: {
        extension: FileExtensionEnum.PY,
      },
    },
    type: CommandCenterTypeEnum.FILE,
    actions: [
      {
        interaction: {
          options: {
            file_path: 'default_repo/dbt/demo/models/example/my_first_dbt_model.sql',
          },
          type: CommandCenterActionInteractionTypeEnum.OPEN_FILE,
        },
      },
    ],
  },
  {
    title: 'Build core data users',
    description: 'Daily pipeline to build user dimension table.',
    type: CommandCenterTypeEnum.PIPELINE,
  },
  {
    title: 'Generate code 2',
    description: 'Use AI to create code.',
    type: CommandCenterTypeEnum.ACTION,
  },
  {
    title: 'Load titanic 2',
    description: 'Python data loader block.',
    metadata: {
      block: {
        type: BlockTypeEnum.DATA_LOADER,
      },
    },
    type: CommandCenterTypeEnum.BLOCK,
  },
  {
    title: 'transform_data.sql',
    description: 'default_repo/risk/data/transform_data.sql',
    file: {
        extension: FileExtensionEnum.SQL,
      },
    type: CommandCenterTypeEnum.FILE,
  },
  {
    title: 'Build core data users 2',
    description: 'Daily pipeline to build user dimension table.',
    type: CommandCenterTypeEnum.PIPELINE,
  },
  {
    title: 'Daily run 2',
    description: 'Trigger for Build core data users pipeline.',
    type: CommandCenterTypeEnum.TRIGGER,
  },
  // @ts-ignore
].map((item: CommandCenterItemType) => ({
  ...item,
  uuid: [
    item?.title,
    item?.description,
    item?.type,
    item?.subtype,
  ]?.map(v => v || '_')?.join('/'),
}));
