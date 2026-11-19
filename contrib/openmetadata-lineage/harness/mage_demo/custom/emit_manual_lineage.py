if 'custom' not in globals():
    from mage_ai.data_preparation.decorators import custom

from mage_omd_lineage.adapters import lineage_emit


@custom
def emit_manual_lineage(*args, **kwargs):
    """Publish lineage only after every upstream block in manual_lineage succeeded."""
    lineage_emit(
        pipeline_uuid="manual_lineage",
        repo_path="/home/src/mage_demo",
    )
    return None
