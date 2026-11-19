if 'custom' not in globals():
    from mage_ai.data_preparation.decorators import custom

from mage_omd_lineage.adapters import lineage_emit


@custom
def emit_lineage(*args, **kwargs):
    """Sentinel block: publish lineage only after every block succeeded."""
    lineage_emit(
        pipeline_uuid="demo_lineage",
        repo_path="/home/src/mage_demo",
    )
    return None
