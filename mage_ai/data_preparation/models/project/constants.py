from enum import Enum


class FeatureUUID(str, Enum):
    ADD_NEW_BLOCK_V2 = 'add_new_block_v2'
    CODE_BLOCK_V2 = 'code_block_v2'
    COMMAND_CENTER = 'command_center'
    COMPUTE_MANAGEMENT = 'compute_management'
    CUSTOM_DESIGN = 'custom_design'
    DATA_INTEGRATION_IN_BATCH_PIPELINE = 'data_integration_in_batch_pipeline'
    DBT_V2 = 'dbt_v2'
    GLOBAL_HOOKS = 'global_hooks'
    INTERACTIONS = 'interactions'
    LOCAL_TIMEZONE = 'display_local_timezone'
    NOTEBOOK_BLOCK_OUTPUT_SPLIT_VIEW = 'notebook_block_output_split_view'
    OPERATION_HISTORY = 'operation_history'
