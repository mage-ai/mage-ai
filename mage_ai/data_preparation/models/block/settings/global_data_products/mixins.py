from typing import Dict, Optional

from mage_ai.data_preparation.models.block.settings.global_data_products.models import (
    GlobalDataProductConfiguration,
)


class GlobalDataProductsMixin:
    configuration = dict(global_data_products=None)

    def global_data_products_configuration(
        self,
    ) -> Optional[Dict[str, GlobalDataProductConfiguration]]:
        if self.configuration:
            configs = self.configuration.get('global_data_products', {})
            if configs and isinstance(configs, dict):
                return {
                    k: GlobalDataProductConfiguration.load(**v) if isinstance(v, dict) else v
                    for k, v in configs.items()
                }
