import { BlockTypeEnum } from '@interfaces/BlockType';
import { CommandCenterTypeEnum } from '@interfaces/CommandCenterType';
import { FileExtensionEnum } from '@interfaces/FileType';

export const ITEMS = [
  {
    description: 'Configure your project.',
    title: 'Open project settings',
    type: CommandCenterTypeEnum.APPLICATION,
    actions: [
      {
        page: {
          path: '/settings/workspace/preferences',
        },
      },
      {
        delay: 5000,
        page: {
          path: '/settings/account/profile',
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
    title: 'export_users.py',
    description: 'default_repo/utils/growth/export_users.py',
    metadata: {
      file: {
        extension: FileExtensionEnum.PY,
      },
    },
    type: CommandCenterTypeEnum.FILE,
  },
  {
    title: 'Build core data users',
    description: 'Daily pipeline to build user dimension table.',
    type: CommandCenterTypeEnum.PIPELINE,
  },
  {
    title: 'Daily run',
    description: 'Trigger for Build core data users pipeline.',
    type: CommandCenterTypeEnum.TRIGGER,
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
].map(item => ({
  ...item,
  uuid: [
    item?.title,
    item?.description,
    item?.type,
    item?.subtype,
  ]?.map(v => v || '_')?.join('/'),
}));
