from mage_integrations.sources.microsoft_bing_ads.streams.base import BaseStream
from typing import Any, Dict, Mapping, Optional


class Accounts(BaseStream):
    """
    Searches for accounts that the current authenticated user can access.
    API doc: https://docs.microsoft.com/en-us/advertising/customer-management-service/searchaccounts?view=bingads-13
    Account schema: https://docs.microsoft.com/en-us/advertising/customer-management-service/advertiseraccount?view=bingads-13
    Stream caches incoming responses to be able to reuse this data in Campaigns stream
    """

    primary_key = "Id"
    data_field: str = "AdvertiserAccount"
    service_name: str = "CustomerManagementService"
    operation_name: str = "SearchAccounts"
    additional_fields: str = "TaxCertificate AccountMode"
    # maximum page size
    page_size_limit: int = 1000

    def next_page_token(self, response, current_page_token: Optional[int]) -> Optional[Mapping[str, Any]]:
        current_page_token = current_page_token or 0
        if response is not None and hasattr(response, self.data_field):
            return None if self.page_size_limit > len(response[self.data_field]) else current_page_token + 1
        else:
            return None

    def request_params(
        self,
        next_page_token: Mapping[str, Any] = None,
        **kwargs: Mapping[str, Any],
    ) -> Dict[str, Any]:
        predicates = {
            "Predicate": [
                {
                    "Field": "UserId",
                    "Operator": "Equals",
                    "Value": self._user_id,
                }
            ]
        }

        paging = self._service.factory.create("ns5:Paging")
        paging.Index = next_page_token or 0
        paging.Size = self.page_size_limit
        return {
            "PageInfo": paging,
            "Predicates": predicates,
            "ReturnAdditionalFields": self.additional_fields,
        }
