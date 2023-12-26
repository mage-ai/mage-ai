import { BlockTypeEnum } from '@interfaces/BlockType';
import { CommandCenterTypeEnum } from '@interfaces/CommandCenterType';

export const ITEMS = [
  {
    description: 'Configure your project.',
    title: 'Open project settings',
    type: CommandCenterTypeEnum.APPLICATION,
  },
  {
    description: 'Personalize your profile.',
    title: 'Edit profile',
    type: CommandCenterTypeEnum.APPLICATION,
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
];
