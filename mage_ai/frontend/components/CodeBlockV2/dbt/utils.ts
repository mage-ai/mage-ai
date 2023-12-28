import BlockType from '@interfaces/BlockType';
import ErrorsType from '@interfaces/ErrorsType';
import { CONFIG_KEY_DBT_PROFILE_TARGET, CONFIG_KEY_DBT_PROJECT_NAME } from '@interfaces/ChartBlockType';

export function validate({ configuration }: BlockType): ErrorsType {
  if (!configuration?.[CONFIG_KEY_DBT_PROJECT_NAME]) {
    return {
      displayMessage: 'dbt project name is missing from block’s configuration. ' +
        'Please click the configuration tab and select a project.',
    } as ErrorsType;
  } else if (!configuration?.[CONFIG_KEY_DBT_PROFILE_TARGET]) {
    return {
      displayMessage: 'dbt profile target is missing from block’s configuration. ' +
        'Please click the configuration tab and select a profile target.',
    } as ErrorsType;
  }
}
