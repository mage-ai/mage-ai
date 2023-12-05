from dataclasses import dataclass

from mage_ai.services.spark.models.base import BaseSparkModel


@dataclass
class MemoryMetrics(BaseSparkModel):
    total_off_heap_storage_memory: int = None  # 0
    total_on_heap_storage_memory: int = None  # 455501414
    used_off_heap_storage_memory: int = None  # 0
    used_on_heap_storage_memory: int = None  # 983495


@dataclass
class Metrics(BaseSparkModel):
    direct_pool_memory: int = None  # 0
    jvm_heap_memory: int = None  # 0
    jvm_off_heap_memory: int = None  # 0
    major_gc_count: int = None  # 0
    major_gc_time: int = None  # 0
    mapped_pool_memory: int = None  # 0
    minor_gc_count: int = None  # 0
    minor_gc_time: int = None  # 0
    off_heap_execution_memory: int = None  # 0
    off_heap_storage_memory: int = None  # 0
    off_heap_unified_memory: int = None  # 0
    on_heap_execution_memory: int = None  # 0
    on_heap_storage_memory: int = None  # 0
    on_heap_unified_memory: int = None  # 0
    process_tree_jvmrss_memory: int = None  # 0
    process_tree_jvmv_memory: int = None  # 0
    process_tree_other_rss_memory: int = None  # 0
    process_tree_other_v_memory: int = None  # 0
    process_tree_python_rss_memory: int = None  # 0
    process_tree_python_v_memory: int = None  # 0
    total_gc_time: int = None  # 0
