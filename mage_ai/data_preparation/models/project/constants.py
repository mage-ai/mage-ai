from enum import Enum


class FeatureUUID(str, Enum):
    ADD_NEW_BLOCK_V2 = 'add_new_block_v2'
    COMPUTE_MANAGEMENT = 'compute_management'
    DATA_INTEGRATION_IN_BATCH_PIPELINE = 'data_integration_in_batch_pipeline'
    INTERACTIONS = 'interactions'
    LOCAL_TIMEZONE = 'display_local_timezone'
    OPERATION_HISTORY = 'operation_history'
