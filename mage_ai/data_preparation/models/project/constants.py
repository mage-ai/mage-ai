from enum import Enum


class FeatureUUID(str, Enum):
    ADD_NEW_BLOCK_V2 = 'add_new_block_v2'
    COMPUTE_MANAGEMENT = 'compute_management'
    DATA_INTEGRATION_IN_BATCH_PIPELINE = 'data_integration_in_batch_pipeline'
    GLOBAL_HOOKS = 'global_hooks'
    INTERACTIONS = 'interactions'
    LOCAL_TIMEZONE = 'display_local_timezone'
    NOTEBOOK_BLOCK_OUTPUT_SPLIT_VIEW = 'notebook_block_output_split_view'
    OPERATION_HISTORY = 'operation_history'
