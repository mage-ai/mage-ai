"""
Setup expectations for test sub classes
Run discovery for as a prerequisite for most tests
"""
import unittest
import os
from datetime import timedelta
from datetime import datetime as dt

from tap_tester import connections, menagerie, runner, LOGGER
from tap_tester.base_case import BaseCase

class SalesforceBaseTest(BaseCase):
    """
    Setup expectations for test sub classes.
    Metadata describing streams.

    A bunch of shared methods that are used in tap-tester tests.
    Shared tap-specific methods (as needed).

    FUTURE WORK
      custom fields | https://stitchdata.atlassian.net/browse/SRCE-4813
      bookmarks     | https://stitchdata.atlassian.net/browse/SRCE-4814
      REST API      | https://stitchdata.atlassian.net/browse/SRCE-4815
      timing        | https://stitchdata.atlassian.net/browse/SRCE-4816
      more data     | https://stitchdata.atlassian.net/browse/SRCE-4824
    """
    AUTOMATIC_FIELDS = "automatic"
    REPLICATION_KEYS = "valid-replication-keys"
    PRIMARY_KEYS = "table-key-properties"
    FOREIGN_KEYS = "table-foreign-key-properties"
    REPLICATION_METHOD = "forced-replication-method"
    API_LIMIT = "max-row-limit"
    INCREMENTAL = "INCREMENTAL"
    FULL_TABLE = "FULL_TABLE"
    START_DATE_FORMAT = "%Y-%m-%dT00:00:00Z"
    BOOKMARK_COMPARISON_FORMAT = "%Y-%m-%dT00:00:00.000000Z"
    start_date = ""
    salesforce_api = ""

    @staticmethod
    def tap_name():
        """The name of the tap"""
        return "tap-salesforce"

    @staticmethod
    def get_type():
        """the expected url route ending"""
        return "platform.salesforce"

    def get_properties(self, original: bool = True):
        """Configuration properties required for the tap."""
        return_value = {
            'start_date': '2020-11-23T00:00:00Z',
            'instance_url': 'https://singer2-dev-ed.my.salesforce.com',
            'select_fields_by_default': 'true',
            'quota_percent_total': '80',
            'api_type': self.salesforce_api,
            'is_sandbox': 'false'
        }

        if original:
            return return_value

        # This test needs the new connections start date to be larger than the default
        assert self.start_date > return_value["start_date"]

        return_value["start_date"] = self.start_date
        return return_value

    @staticmethod
    def get_credentials():
        """Authentication information for the test account"""
        return {'refresh_token': os.getenv('TAP_SALESFORCE_REFRESH_TOKEN'),
                'client_id': os.getenv('TAP_SALESFORCE_CLIENT_ID'),
                'client_secret': os.getenv('TAP_SALESFORCE_CLIENT_SECRET')}

    def expected_metadata(self):
        """The expected streams and metadata about the streams"""
        default = {
            self.PRIMARY_KEYS: {"Id"},
            self.REPLICATION_METHOD: self.INCREMENTAL,
            self.REPLICATION_KEYS: {"SystemModstamp"}
        }
        default_full = {
            self.PRIMARY_KEYS: {"Id"},
            self.REPLICATION_METHOD: self.FULL_TABLE,
        }

        incremental_created_date = {
            self.REPLICATION_KEYS: {'CreatedDate'},
            self.PRIMARY_KEYS: {'Id'},
            self.REPLICATION_METHOD: self.INCREMENTAL,
        }

        incremental_last_modified = {
            self.PRIMARY_KEYS: {'Id'},
            self.REPLICATION_KEYS: {'LastModifiedDate'},
            self.REPLICATION_METHOD: self.INCREMENTAL,
        }
        return {
            'AIApplication': default,  # removed # 6/13/2022 added back 7/10/2022
            'AIApplicationConfig': default,  # removed # 6/13/2022 added back 7/10/2022
            'AIInsightAction': default,  # removed # 6/13/2022 added back 7/10/2022
            'AIInsightFeedback': default,  # removed # 6/13/2022 added back 7/10/2022
            'AIInsightReason': default,  # removed # 6/13/2022 added back 7/10/2022
            'AIInsightValue': default,  # removed # 6/13/2022 added back 7/10/2022
            'AIRecordInsight': default,  # removed # 6/13/2022 added back 7/10/2022
            'Account': default,
            'AccountCleanInfo': default,  # new
            'AccountContactRole': default,
            'AccountFeed': default,
            'AccountHistory': incremental_created_date,
            'AccountPartner': default,
            'AccountShare': incremental_last_modified,
            'ActionLinkGroupTemplate': default,
            'ActionLinkTemplate': default,
            'ActiveFeatureLicenseMetric': default,
            'ActivePermSetLicenseMetric': default,
            'ActiveProfileMetric': default,
            'AdditionalNumber': default,
            'AlternativePaymentMethod': default,  # new
            'AlternativePaymentMethodShare': incremental_last_modified,  # new
            'ApexClass': default,
            'ApexComponent': default,
            'ApexEmailNotification': default,  # new
            'ApexLog': default,  # new
            'ApexPage': default,
            'ApexPageInfo': default_full,
            'ApexTestQueueItem': default,
            'ApexTestResult': default,
            'ApexTestResultLimits': default,
            'ApexTestRunResult': default,
            'ApexTestSuite': default,
            'ApexTrigger': default,
            'ApiAnomalyEventStore': default,  # new
            'ApiAnomalyEventStoreFeed': default,  # new
            'ApiEvent': incremental_created_date,  # new
            'AppAnalyticsQueryRequest': default,  # new
            'AppDefinition': default_full,
            'AppMenuItem': default,
            'AppUsageAssignment': default,  # removed # 6/13/2022 added back 7/10/2022
            'AppointmentAssignmentPolicy': default,  # new
            'AppointmentScheduleAggr': default,  # new
            'AppointmentScheduleLog': default,  # new
            'AppointmentSchedulingPolicy': default,  # new
            'AppointmentTopicTimeSlot': default,  # new
            'AppointmentTopicTimeSlotFeed': default,  # new
            'AppointmentTopicTimeSlotHistory': incremental_created_date,  # new
            'Asset': default,
            'AssetAction': default,  # new
            'AssetActionSource': default,  # new
            'AssetFeed': default,
            'AssetHistory': incremental_created_date,
            'AssetRelationship': default,
            'AssetRelationshipFeed': default,
            'AssetRelationshipHistory': incremental_created_date,
            'AssetShare': incremental_last_modified,
            'AssetStatePeriod': default,  # new
            'AssignedResource': default,  # new
            'AssignedResourceFeed': default,  # new
            'AssignmentRule': default,
            'AssociatedLocation': default,
            'AssociatedLocationHistory': incremental_created_date,
            'AsyncApexJob': incremental_created_date,
            'AsyncOperationLog': default,  # new
            'Attachment': default,
            'AuraDefinition': default,
            'AuraDefinitionBundle': default,
            'AuraDefinitionBundleInfo': default_full,
            'AuraDefinitionInfo': incremental_last_modified,
            'AuthConfig': default,
            'AuthConfigProviders': default,
            'AuthProvider': incremental_created_date,  # new
            'AuthSession': incremental_last_modified,
            'AuthorizationForm': default,
            'AuthorizationFormConsent': default,
            'AuthorizationFormConsentHistory': incremental_created_date,
            'AuthorizationFormConsentShare': incremental_last_modified,
            'AuthorizationFormDataUse': default,
            'AuthorizationFormDataUseHistory': incremental_created_date,
            'AuthorizationFormDataUseShare': incremental_last_modified,
            'AuthorizationFormHistory': incremental_created_date,
            'AuthorizationFormShare': incremental_last_modified,
            'AuthorizationFormText': default,
            'AuthorizationFormTextFeed': default,
            'AuthorizationFormTextHistory': incremental_created_date,
            'BackgroundOperation': default,  # new
            'BrandTemplate': default,
            'BrandingSet': default,
            'BrandingSetProperty': default,
            'BulkApiResultEventStore': incremental_created_date,  # new
            'BusinessHours': default,
            'BusinessProcess': default,
            'Calendar': default,
            'CalendarView': default,
            'CalendarViewShare': incremental_last_modified,
            'CallCenter': default,
            'CallCoachingMediaProvider': default,
            'Campaign': default,
            'CampaignFeed': default,
            'CampaignHistory': incremental_created_date,
            'CampaignMember': default,
            'CampaignMemberStatus': default,
            'CampaignShare': incremental_last_modified,
            'CardPaymentMethod': default,  # new
            'Case': default,
            'CaseComment': default,
            'CaseContactRole': default,
            'CaseFeed': default,
            'CaseHistory': incremental_created_date,
            'CaseMilestone': default,  # new
            'CaseShare': incremental_last_modified,
            'CaseSolution': default,
            'CaseTeamMember': default,
            'CaseTeamRole': default,
            'CaseTeamTemplate': default,
            'CaseTeamTemplateMember': default,
            'CaseTeamTemplateRecord': default,
            'CategoryData': default,  # new
            'CategoryNode': default,
            'ChatterActivity': default,
            'ChatterExtension': default,
            'ChatterExtensionConfig': default,
            'ClientBrowser': incremental_created_date,
            'CollaborationGroup': default,
            'CollaborationGroupFeed': default,
            'CollaborationGroupMember': default,
            'CollaborationGroupMemberRequest': default,
            'CollaborationInvitation': default,
            'CommSubscription': default,
            'CommSubscriptionChannelType': default,
            'CommSubscriptionChannelTypeFeed': default,
            'CommSubscriptionChannelTypeHistory': incremental_created_date,
            'CommSubscriptionChannelTypeShare': incremental_last_modified,
            'CommSubscriptionConsent': default,
            'CommSubscriptionConsentFeed': default,
            'CommSubscriptionConsentHistory': incremental_created_date,
            'CommSubscriptionConsentShare': incremental_last_modified,
            'CommSubscriptionFeed': default,
            'CommSubscriptionHistory': incremental_created_date,
            'CommSubscriptionShare': incremental_last_modified,
            'CommSubscriptionTiming': default,
            'CommSubscriptionTimingFeed': default,
            'CommSubscriptionTimingHistory': incremental_created_date,
            'Community': default,
            'ConferenceNumber': default,
            'ConnectedApplication': default,
            'ConsumptionRate': default,  # new
            'ConsumptionRateHistory': incremental_created_date,  # new
            'ConsumptionSchedule': default,  # new
            'ConsumptionScheduleFeed': default,  # new
            'ConsumptionScheduleHistory': incremental_created_date,  # new
            'ConsumptionScheduleShare': incremental_last_modified,  # new
            'Contact': default,
            'ContactCleanInfo': default,  # new
            'ContactFeed': default,
            'ContactHistory': incremental_created_date,
            'ContactPointAddress': default,
            'ContactPointAddressHistory': incremental_created_date,
            'ContactPointAddressShare': incremental_last_modified,
            'ContactPointConsent': default,
            'ContactPointConsentHistory': incremental_created_date,
            'ContactPointConsentShare': incremental_last_modified,
            'ContactPointEmail': default,
            'ContactPointEmailHistory': incremental_created_date,
            'ContactPointEmailShare': incremental_last_modified,
            'ContactPointPhone': default,
            'ContactPointPhoneHistory': incremental_created_date,
            'ContactPointPhoneShare': incremental_last_modified,
            'ContactPointTypeConsent': default,
            'ContactPointTypeConsentHistory': incremental_created_date,
            'ContactPointTypeConsentShare': incremental_last_modified,
            'ContactRequest': default,  # new
            'ContactRequestShare': incremental_last_modified,  # new
            'ContactShare': incremental_last_modified,
            'ContentAsset': default,
            'ContentDistribution': default,
            'ContentDistributionView': default,
            'ContentDocument': default,
            'ContentDocumentFeed': default,
            'ContentDocumentHistory': incremental_created_date,
            'ContentDocumentSubscription': default_full,  # new
            'ContentFolder': default,
            'ContentFolderLink': default_full,
            'ContentNotification': incremental_created_date,  # new
            'ContentTagSubscription': default_full,  # new
            'ContentUserSubscription': default_full,  # new
            'ContentVersion': default,
            'ContentVersionComment': incremental_created_date,  # new
            'ContentVersionHistory': incremental_created_date,
            'ContentVersionRating': incremental_last_modified,  # new
            'ContentWorkspace': default,
            'ContentWorkspaceDoc': default,
            'ContentWorkspaceMember': incremental_created_date,
            'ContentWorkspacePermission': default,
            'ContentWorkspaceSubscription': default_full,  # new
            'Contract': default,
            'ContractContactRole': default,
            'ContractFeed': default,
            'ContractHistory': incremental_created_date,
            'ContractLineItem': default,  # new
            'ContractLineItemHistory': incremental_created_date,  # new
            'ConversationEntry': default,  # new
            'CorsWhitelistEntry': default,  # new
            'CredentialStuffingEventStore': default,  # new
            'CredentialStuffingEventStoreFeed': default,  # new
            'CreditMemo': default,  # new
            'CreditMemoFeed': default,  # new
            'CreditMemoHistory': incremental_created_date,  # new
            'CreditMemoInvApplication': default,  # new
            'CreditMemoInvApplicationFeed': default,  # new 6/13/2022
            'CreditMemoInvApplicationHistory': incremental_created_date,  # new 6/13/2022
            'CreditMemoLine': default,  # new
            'CreditMemoLineFeed': default,  # new
            'CreditMemoLineHistory': incremental_created_date,  # new
            'CreditMemoShare': incremental_last_modified,  # new
            'CronJobDetail': default_full,
            'CronTrigger': incremental_created_date,
            'CspTrustedSite': default,  # new
            'CustomBrand': incremental_last_modified,
            'CustomBrandAsset': incremental_last_modified,
            'CustomHelpMenuItem': default,
            'CustomHelpMenuSection': default,
            'CustomHttpHeader': default,
            'CustomNotificationType': default,
            'CustomObjectUserLicenseMetrics': default,
            'CustomPermission': default,
            'CustomPermissionDependency': default,
            'DandBCompany': default,  # new
            'Dashboard': default,
            'DashboardComponent': default_full,
            'DashboardComponentFeed': default,
            'DashboardFeed': default,
            'DataAssessmentFieldMetric': default,  # new
            'DataAssessmentMetric': default,  # new
            'DataAssessmentValueMetric': default,  # new
            'DataUseLegalBasis': default,
            'DataUseLegalBasisHistory': incremental_created_date,
            'DataUseLegalBasisShare': incremental_last_modified,
            'DataUsePurpose': default,
            'DataUsePurposeHistory': incremental_created_date,
            'DataUsePurposeShare': incremental_last_modified,
            'DatacloudAddress': default_full,
            'DatacloudCompany': default_full,  # new
            'DatacloudContact': default_full,  # new
            'DatacloudDandBCompany': default_full,  # new
            'DatacloudOwnedEntity': default,  # new
            'DatacloudPurchaseUsage': default,  # new
            'DeleteEvent': default,
            'DigitalWallet': default,  # new
            'Document': default,
            'DocumentAttachmentMap': incremental_created_date,
            'Domain': default,
            'DomainSite': default,
            'DuplicateRecordItem': default,  # new
            'DuplicateRecordSet': default,  # new
            'DuplicateRule': default,
            'EmailCapture': default,  # new
            'EmailDomainFilter': default,  # new
            'EmailDomainKey': default,  # new
            'EmailMessage': default,
            'EmailMessageRelation': default,
            'EmailRelay': default,  # new
            'EmailServicesAddress': default,
            'EmailServicesFunction': default,
            'EmailTemplate': default,
            'EmbeddedServiceDetail': default_full,
            'EmbeddedServiceLabel': default_full,
            'EngagementChannelType': default,
            'EngagementChannelTypeFeed': default,
            'EngagementChannelTypeHistory': incremental_created_date,
            'EngagementChannelTypeShare': incremental_last_modified,
            'EnhancedLetterhead': default,
            'EnhancedLetterheadFeed': default,
            'Entitlement': default,  # new
            'EntitlementContact': default,  # new
            'EntitlementFeed': default,  # new
            'EntitlementHistory': incremental_created_date,  # new
            'EntitlementTemplate': default,  # new
            'EntityDefinition': incremental_last_modified,
            'EntityMilestone': default,  # new
            'EntityMilestoneFeed': default,  # new
            'EntityMilestoneHistory': incremental_created_date,  # new
            'EntitySubscription': incremental_created_date,
            'Event': default,
            'EventBusSubscriber': default_full,
            'EventFeed': default,
            'EventLogFile': default,  # new
            'EventRelation': default,
            'ExpressionFilter': default,
            'ExpressionFilterCriteria': default,
            'ExternalDataSource': default,
            'ExternalDataUserAuth': default,
            'ExternalEvent': default,
            'ExternalEventMapping': default,
            'ExternalEventMappingShare': incremental_last_modified,
            'FeedAttachment': default_full,
            'FeedComment': default,
            'FeedItem': default,
            'FeedPollChoice': incremental_created_date,  # new
            'FeedPollVote': incremental_last_modified,  # new
            'FeedRevision': default,
            'FieldPermissions': default,
            'FieldSecurityClassification': default,  # new
            'FileSearchActivity': default,  # new
            'FinanceBalanceSnapshot': default,  # new
            'FinanceBalanceSnapshotShare': incremental_last_modified,  # new
            'FinanceTransaction': default,  # new
            'FinanceTransactionShare': incremental_last_modified,  # new
            'FiscalYearSettings': default,
            'FlowDefinitionView': incremental_last_modified,
            'FlowInterview': default,
            'FlowInterviewLog': default,
            'FlowInterviewLogEntry': default,
            'FlowInterviewLogShare': incremental_last_modified,
            'FlowInterviewShare': incremental_last_modified,
            'FlowRecordRelation': default,
            'FlowStageRelation': default,
            'Folder': default,
            'FormulaFunction': default_full,
            'FormulaFunctionAllowedType': default_full,
            'FormulaFunctionCategory': default_full,
            'GrantedByLicense': default,
            'Group': default,
            'GroupMember': default,
            'GtwyProvPaymentMethodType': default,  # new
            'Holiday': default,
            'IPAddressRange': default,  # new
            'Idea': default,
            'IdentityProviderEventStore': incremental_created_date,  # new
            'IdentityVerificationEvent': incremental_created_date,  # new
            'IdpEventLog': default_full,  # new
            'IframeWhiteListUrl': default,
            'Image': default,  # new
            'ImageFeed': default,  # new
            'ImageHistory': incremental_created_date,  # new
            'ImageShare': incremental_last_modified,  # new
            'Individual': default,
            'IndividualHistory': incremental_created_date,
            'IndividualShare': incremental_last_modified,
            'InstalledMobileApp': default,
            'Invoice': default,  # new
            'InvoiceFeed': default,  # new
            'InvoiceHistory': incremental_created_date,  # new
            'InvoiceLine': default,  # new
            'InvoiceLineFeed': default,  # new
            'InvoiceLineHistory': incremental_created_date,  # new
            'InvoiceShare': incremental_last_modified,  # new
            'KnowledgeableUser': default,
            'Lead': default,
            'LeadCleanInfo': default,  # new
            'LeadFeed': default,
            'LeadHistory': incremental_created_date,
            'LeadShare': incremental_last_modified,
            'LeadStatus': default,
            'LegalEntity': default,  # new
            'LegalEntityFeed': default,  # new
            'LegalEntityHistory': incremental_created_date,  # new
            'LegalEntityShare': incremental_last_modified,  # new
            'LightningExitByPageMetrics': default,  # new
            'LightningExperienceTheme': default,
            'LightningOnboardingConfig': default,
            'LightningToggleMetrics': default,  # new
            'LightningUriEvent': default_full,  # new
            'LightningUsageByAppTypeMetrics': default,  # new
            'LightningUsageByBrowserMetrics': default,  # new
            'LightningUsageByFlexiPageMetrics': default,  # new
            'LightningUsageByPageMetrics': default,  # new
            'ListEmail': default,  # new
            'ListEmailIndividualRecipient': default,  # new
            'ListEmailRecipientSource': default,  # new
            'ListEmailShare': incremental_last_modified,  # new
            'ListView': default,
            'ListViewChart': default,
            'ListViewEvent': incremental_created_date,  # new
            'LiveChatSensitiveDataRule': default,  # new
            'Location': default,
            'LocationFeed': default,
            'LocationGroup': default,  # new
            'LocationGroupAssignment': default,  # new
            'LocationGroupFeed': default,  # new
            'LocationGroupHistory': incremental_created_date,  # new
            'LocationGroupShare': incremental_last_modified,  # new
            'LocationHistory': incremental_created_date,
            'LocationShare': incremental_last_modified,
            'LoginAsEvent': incremental_created_date,  # new
            'LoginEvent': default_full,  # new
            'LoginGeo': default,  # new
            'LoginHistory': {self.PRIMARY_KEYS: {'Id'}, self.REPLICATION_KEYS: {'LoginTime'},self.REPLICATION_METHOD: self.INCREMENTAL,},
            'LoginIp': incremental_created_date,
            'LogoutEvent': default_full,  # new
            'MLField': default,  # removed # 6/13/2022 added back 7/10/2022
            'MLPredictionDefinition': default,  # removed # 6/13/2022 added back 7/10/2022
            'Macro': default,
            'MacroHistory': incremental_created_date,
            'MacroInstruction': default,
            'MacroShare': incremental_last_modified,
            'MacroUsage': default,
            'MacroUsageShare': incremental_last_modified,
            'MailmergeTemplate': default,
            'MatchingInformation': default,
            'MatchingRule': default,
            'MatchingRuleItem': default,
            'MessagingChannel': default,  # new
            'MessagingChannelSkill': default,  # new
            'MessagingConfiguration': default,  # new
            'MessagingDeliveryError': default,  # new
            'MessagingEndUser': default,  # new
            'MessagingEndUserHistory': incremental_created_date,  # new
            'MessagingEndUserShare': incremental_last_modified,  # new
            'MessagingLink': default,  # new
            'MessagingSession': default,  # new
            'MessagingSessionFeed': default,  # new
            'MessagingSessionHistory': incremental_created_date,  # new
            'MessagingSessionShare': incremental_last_modified,  # new
            'MessagingTemplate': default,  # new
            'MilestoneType': default,  # new
            'MobileApplicationDetail': default,
            'MsgChannelLanguageKeyword': default,  # new
            'MutingPermissionSet': default,
            'MyDomainDiscoverableLogin': default,
            'NamedCredential': default,
            'Note': default,
            'OauthCustomScope': default,  # new
            'OauthCustomScopeApp': default,  # new
            'OauthToken': incremental_created_date,
            'ObjectPermissions': default,
            'OnboardingMetrics': default,
            'OperatingHours': default,  # new
            'OperatingHoursFeed': default,  # new
            'Opportunity': default,
            'OpportunityCompetitor': default,
            'OpportunityContactRole': default,
            'OpportunityFeed': default,
            'OpportunityFieldHistory': incremental_created_date,
            'OpportunityHistory': default,
            'OpportunityLineItem': default,
            'OpportunityPartner': default,
            'OpportunityShare': incremental_last_modified,
            'OpportunityStage': default,
            'Order': default,
            'OrderFeed': default,
            'OrderHistory': incremental_created_date,
            'OrderItem': default,
            'OrderItemFeed': default,
            'OrderItemHistory': incremental_created_date,
            'OrderShare': incremental_last_modified,
            'OrgDeleteRequest': default,  # new
            'OrgDeleteRequestShare': incremental_last_modified,  # new
            'OrgMetric': default,  # new
            'OrgMetricScanResult': default,  # new
            'OrgMetricScanSummary': default,  # new
            'OrgWideEmailAddress': default,
            'Organization': default,
            'PackageLicense': default,  # new
            'Partner': default,
            'PartyConsent': default,
            'PartyConsentFeed': default,
            'PartyConsentHistory': incremental_created_date,
            'PartyConsentShare': incremental_last_modified,
            'Payment': default,  # new
            'PaymentAuthAdjustment': default,  # new
            'PaymentAuthorization': default,  # new
            'PaymentGateway': default,  # new
            'PaymentGatewayLog': default,  # new
            'PaymentGatewayProvider': default,  # new
            'PaymentGroup': default,  # new
            'PaymentLineInvoice': default,  # new
            'PaymentMethod': default,  # new
            'Period': default,
            'PermissionSet': default,
            'PermissionSetAssignment': default,
            'PermissionSetGroup': default,
            'PermissionSetGroupComponent': default,
            'PermissionSetLicense': default,
            'PermissionSetLicenseAssign': default,
            'PermissionSetTabSetting': default,
            'PlatformCachePartition': default,
            'PlatformCachePartitionType': default,
            'PlatformEventUsageMetric': default_full,
            'Pricebook2': default,
            'Pricebook2History': incremental_created_date,
            'PricebookEntry': default,
            'PricebookEntryHistory': incremental_created_date,
            'ProcessDefinition': default,
            'ProcessException': default,  # new
            'ProcessExceptionShare': incremental_last_modified,  # new
            'ProcessInstance': default,
            'ProcessInstanceNode': default,
            'ProcessInstanceStep': default,
            'ProcessInstanceWorkitem': default,
            'ProcessNode': default,
            'Product2': default,
            'Product2Feed': default,
            'Product2History': incremental_created_date,
            'ProductConsumptionSchedule': default,  # new
            'ProductEntitlementTemplate': default,  # new
            'Profile': default,
            'Prompt': default,
            'PromptAction': default,  # new
            'PromptActionShare': incremental_last_modified,  # new
            'PromptError': default,  # new
            'PromptErrorShare': incremental_last_modified,  # new
            'PromptVersion': default,
            'Publisher': default_full,
            'PushTopic': default,  # new
            'QueueSobject': default,
            'QuickText': default,
            'QuickTextHistory': incremental_created_date,
            'QuickTextShare': incremental_last_modified,
            'QuickTextUsage': default,
            'QuickTextUsageShare': incremental_last_modified,
            'Recommendation': default,
            'RecommendationResponse': default,  # new 6/13/2022
            'RecordAction': default,
            'RecordType': default,
            'RedirectWhitelistUrl': default,
            'Refund': default,  # new
            'RefundLinePayment': default,  # new
            'Report': default,
            'ReportAnomalyEventStore': default,  # new
            'ReportAnomalyEventStoreFeed': default,  # new
            'ReportEvent': default_full,  # new
            'ReportFeed': default,
            'ResourceAbsence': default,  # new
            'ResourceAbsenceFeed': default,  # new
            'ResourceAbsenceHistory': incremental_created_date,  # new
            'ResourcePreference': default,  # new
            'ResourcePreferenceFeed': default,  # new
            'ResourcePreferenceHistory': incremental_created_date,  # new
            'ReturnOrder': default,  # new
            'ReturnOrderFeed': default,  # new
            'ReturnOrderHistory': incremental_created_date,  # new
            'ReturnOrderItemAdjustment': default,  # new
            'ReturnOrderItemTax': default,  # new
            'ReturnOrderLineItem': default,  # new
            'ReturnOrderLineItemFeed': default,  # new
            'ReturnOrderLineItemHistory': incremental_created_date,  # new
            'ReturnOrderShare': incremental_last_modified,  # new
            'SPSamlAttributes': default,  # new
            'SamlSsoConfig': default,
            'Scontrol': default,
            'SearchPromotionRule': default,  # new
            'SecurityCustomBaseline': default,  # new
            'ServiceAppointment': default,  # new
            'ServiceAppointmentFeed': default,  # new
            'ServiceAppointmentHistory': incremental_created_date,  # new
            'ServiceAppointmentShare': incremental_last_modified,  # new
            'ServiceAppointmentStatus': default,  # new
            'ServiceContract': default,  # new
            'ServiceContractFeed': default,  # new
            'ServiceContractHistory': incremental_created_date,  # new
            'ServiceContractShare': incremental_last_modified,  # new
            'ServiceResource': default,  # new
            'ServiceResourceFeed': default,  # new
            'ServiceResourceHistory': incremental_created_date,  # new
            'ServiceResourceShare': incremental_last_modified,  # new
            'ServiceResourceSkill': default,  # new
            'ServiceResourceSkillFeed': default,  # new
            'ServiceResourceSkillHistory': incremental_created_date,  # new
            'ServiceSetupProvisioning': default,  # new
            'ServiceTerritory': default,  # new
            'ServiceTerritoryFeed': default,  # new
            'ServiceTerritoryHistory': incremental_created_date,  # new
            'ServiceTerritoryMember': default,  # new
            'ServiceTerritoryMemberFeed': default,  # new
            'ServiceTerritoryMemberHistory': incremental_created_date,  # new
            'ServiceTerritoryShare': incremental_last_modified,  # new
            'ServiceTerritoryWorkType': default,  # new
            'ServiceTerritoryWorkTypeFeed': default,  # new
            'ServiceTerritoryWorkTypeHistory': incremental_created_date,  # new
            'SessionHijackingEventStore': default,  # new
            'SessionHijackingEventStoreFeed': default,  # new
            'SessionPermSetActivation': default,
            'SetupAssistantStep': default,  # new
            'SetupAuditTrail': incremental_created_date,
            'SetupEntityAccess': default,
            'Site': default,
            'SiteFeed': default,
            'SiteHistory': incremental_created_date,
            'SiteIframeWhiteListUrl': default,
            'SiteRedirectMapping': default,
            'Skill': default,  # new
            'SkillRequirement': default,  # new
            'SkillRequirementFeed': default,  # new
            'SkillRequirementHistory': incremental_created_date,  # new
            'SlaProcess': default,  # new
            'Solution': default,
            'SolutionFeed': default,
            'SolutionHistory': incremental_created_date,
            'Stamp': default,
            'StampAssignment': default,
            'StaticResource': default,
            'StreamingChannel': default,  # new
            'StreamingChannelShare': incremental_last_modified,  # new
            'TabDefinition': default_full,
            'Task': default,
            'TaskFeed': default,
            'TenantUsageEntitlement': default,
            'TestSuiteMembership': default,
            'ThirdPartyAccountLink': default_full,
            'ThreatDetectionFeedback': default,  # new
            'ThreatDetectionFeedbackFeed': default,  # new
            'TimeSlot': default,  # new
            'TodayGoal': default,
            'TodayGoalShare': incremental_last_modified,
            'Topic': default,
            'TopicAssignment': default,
            'TopicFeed': default,
            'TopicUserEvent': incremental_created_date,  # new
            'TransactionSecurityPolicy': default,  # new
            'Translation': default,
            'UiFormulaCriterion': default,
            'UiFormulaRule': default,
            'UriEvent': default_full,  # new
            'User': default,
            'UserAppInfo': default,
            'UserAppMenuCustomization': default,
            'UserAppMenuCustomizationShare': incremental_last_modified,
            'UserAppMenuItem': default_full,
            'UserEmailPreferredPerson': default,
            'UserEmailPreferredPersonShare': incremental_last_modified,
            'UserFeed': default,
            'UserLicense': default,
            'UserListView': default,
            'UserListViewCriterion': default,
            'UserLogin': incremental_last_modified,
            'UserPackageLicense': default,  # new
            'UserPermissionAccess': default_full,
            'UserPreference': default,
            'UserProvAccount': default,  # new
            'UserProvAccountStaging': default,  # new
            'UserProvMockTarget': default,  # new
            'UserProvisioningConfig': default,  # new
            'UserProvisioningLog': default,  # new
            'UserProvisioningRequest': default,  # new
            'UserProvisioningRequestShare': incremental_last_modified,  # new
            'UserRole': default,
            'UserSetupEntityAccess': default_full,
            'UserShare': incremental_last_modified,
            'VerificationHistory': default,  # new
            'VisualforceAccessMetrics': default,  # new
            'WaveAutoInstallRequest': default,
            'WaveCompatibilityCheckItem': default,
            'WebLink': default,  # new
            'WorkOrder': default,  # new
            'WorkOrderFeed': default,  # new
            'WorkOrderHistory': incremental_created_date,  # new
            'WorkOrderLineItem': default,  # new
            'WorkOrderLineItemFeed': default,  # new
            'WorkOrderLineItemHistory': incremental_created_date,  # new
            'WorkOrderLineItemStatus': default,  # new
            'WorkOrderShare': incremental_last_modified,  # new
            'WorkOrderStatus': default,  # new
            'WorkType': default,  # new
            'WorkTypeFeed': default,  # new
            'WorkTypeGroup': default,  # new
            'WorkTypeGroupFeed': default,  # new
            'WorkTypeGroupHistory': incremental_created_date,  # new
            'WorkTypeGroupMember': default,  # new
            'WorkTypeGroupMemberFeed': default,  # new
            'WorkTypeGroupMemberHistory': incremental_created_date,  # new
            'WorkTypeGroupShare': incremental_last_modified,  # new
            'WorkTypeHistory': incremental_created_date,  # new
            'WorkTypeShare': incremental_last_modified,  # new
            'RecentlyViewed': default_full,  # new TODO verify this is not a bug
            'TaskPriority': default,  # new TODO
            'DeclinedEventRelation': default,  # new TODO
            'AcceptedEventRelation': default,  # new TODO
            'OrderStatus': default,  # new TODO
            'SolutionStatus': default,  # new TODO
            'CaseStatus': default,  # new TODO
            'TaskStatus': default,  # new TODO
            'PartnerRole': default,  # new TODO
            'ContractStatus': default,  # new TODO
            'UndecidedEventRelation': default,  # new TODO
            # Newly discovered as of 2/12/2022
            'BriefcaseAssignment': default,
            'BriefcaseDefinition': default,
            'BriefcaseRule': default,
            'BriefcaseRuleFilter': default,
            # 'CartCheckoutSession': default,  # removed # 6/13/2022
            # 'CartDeliveryGroup': default,  # removed # 6/13/2022
            # 'CartItem': default,  # removed # 6/13/2022
            # 'CartRelatedItem': default,  # removed # 6/13/2022
            # 'CartTax': default,  # removed # 6/13/2022
            # 'CartValidationOutput': default,  # removed # 6/13/2022
            'OperatingHoursHoliday': default,
            'OperatingHoursHolidayFeed': default,
            'PermissionSetEventStore': incremental_created_date,
            'Shift': default,
            'ShiftFeed': default,
            'ShiftHistory': incremental_created_date,
            'ShiftShare': incremental_last_modified,
            'ShiftStatus': default,
            # 'WebCart': default,  # removed # 6/13/2022
            # 'WebCartHistory': incremental_created_date,  # removed # 6/13/2022
            # 'WebCartShare': incremental_last_modified,  # removed # 6/13/2022
            # 'WebStore': default,  # removed # 6/13/2022
            # 'WebStoreShare': incremental_last_modified,  # removed # 6/13/2022
            'WorkPlan': default,
            'WorkPlanFeed': default,
            'WorkPlanHistory': incremental_created_date,
            'WorkPlanShare': incremental_last_modified,
            'WorkPlanTemplate': default,
            'WorkPlanTemplateEntry': default,
            'WorkPlanTemplateEntryFeed': default,
            'WorkPlanTemplateEntryHistory': incremental_created_date,
            'WorkPlanTemplateFeed': default,
            'WorkPlanTemplateHistory': incremental_created_date,
            'WorkPlanTemplateShare': incremental_last_modified,
            'WorkStep': default,
            'WorkStepFeed': default,
            'WorkStepHistory': incremental_created_date,
            'WorkStepStatus': default,
            'WorkStepTemplate': default,
            'WorkStepTemplateFeed': default,
            'WorkStepTemplateHistory': incremental_created_date,
            'WorkStepTemplateShare': incremental_last_modified,
        }

    def rest_only_streams(self):
        """A group of streams that is only discovered when the REST API is in use."""
        return {
            'CaseStatus',
            'DeclinedEventRelation',
            'RecentlyViewed',
            'SolutionStatus',
            'TaskStatus',
            'OrderStatus',
            'AcceptedEventRelation',
            'ContractStatus',
            'PartnerRole',
            'TaskPriority',
            'UndecidedEventRelation',
        }

    def expected_streams(self):
        """A set of expected stream names"""
        streams = set(self.expected_metadata().keys())

        if self.salesforce_api == 'BULK':
            return streams.difference(self.rest_only_streams())
        return streams

    def child_streams(self):
        """
        Return a set of streams that are child streams
        based on having foreign key metadata
        """
        return {stream for stream, metadata in self.expected_metadata().items()
                if metadata.get(self.FOREIGN_KEYS)}

    def expected_primary_keys(self):
        """
        return a dictionary with key of table name
        and value as a set of primary key fields
        """
        return {table: properties.get(self.PRIMARY_KEYS, set())
                for table, properties
                in self.expected_metadata().items()}

    def expected_replication_keys(self):
        """
        return a dictionary with key of table name
        and value as a set of replication key fields
        """
        return {table: properties.get(self.REPLICATION_KEYS, set())
                for table, properties
                in self.expected_metadata().items()}

    def expected_foreign_keys(self):
        """
        return a dictionary with key of table name
        and value as a set of foreign key fields
        """
        return {table: properties.get(self.FOREIGN_KEYS, set())
                for table, properties
                in self.expected_metadata().items()}


    def expected_automatic_fields(self):
        auto_fields = {}
        for k, v in self.expected_metadata().items():
            auto_fields[k] = v.get(self.PRIMARY_KEYS, set()) | v.get(self.REPLICATION_KEYS, set()) \
                | v.get(self.FOREIGN_KEYS, set())
        return auto_fields

    def expected_replication_method(self):
        """return a dictionary with key of table name nd value of replication method"""
        return {table: properties.get(self.REPLICATION_METHOD, None)
                for table, properties
                in self.expected_metadata().items()}

    def setUp(self):
        """Verify that you have set the prerequisites to run the tap (creds, etc.)"""
        missing_envs = [x for x in ['TAP_SALESFORCE_CLIENT_ID',
                                    'TAP_SALESFORCE_CLIENT_SECRET',
                                    'TAP_SALESFORCE_REFRESH_TOKEN']
                        if os.getenv(x) is None]

        if missing_envs:
            raise Exception("set environment variables")

    #########################
    #   Helper Methods      #
    #########################

    def run_and_verify_check_mode(self, conn_id):
        """
        Run the tap in check mode and verify it succeeds.
        This should be ran prior to field selection and initial sync.

        Return the connection id and found catalogs from menagerie.
        """
        # run in check mode
        check_job_name = runner.run_check_mode(self, conn_id)

        # verify check exit codes
        exit_status = menagerie.get_exit_status(conn_id, check_job_name)
        menagerie.verify_check_exit_status(self, exit_status, check_job_name)

        found_catalogs = menagerie.get_catalogs(conn_id)
        self.assertGreater(len(found_catalogs), 0, msg="unable to locate schemas for connection {}".format(conn_id))

        return found_catalogs

    def run_and_verify_sync(self, conn_id):
        """
        Run a sync job and make sure it exited properly.
        Return a dictionary with keys of streams synced
        and values of records synced for each stream
        """
        # Run a sync job using orchestrator
        sync_job_name = runner.run_sync_mode(self, conn_id)

        # Verify tap and target exit codes
        exit_status = menagerie.get_exit_status(conn_id, sync_job_name)
        menagerie.verify_sync_exit_status(self, exit_status, sync_job_name)

        # Verify actual rows were synced
        sync_record_count = runner.examine_target_output_file(
            self, conn_id, self.expected_streams(), self.expected_primary_keys())
        self.assertGreater(
            sum(sync_record_count.values()), 0,
            msg="failed to replicate any data: {}".format(sync_record_count)
        )
        LOGGER.info("total replicated row count: %s", sum(sync_record_count.values()))

        return sync_record_count

    def perform_and_verify_table_and_field_selection(self,
                                                     conn_id,
                                                     test_catalogs,
                                                     select_all_fields=True):
        """
        Perform table and field selection based off of the streams to select
        set and field selection parameters.

        Verify this results in the expected streams selected and all or no
        fields selected for those streams.
        """

        # Select all available fields or select no fields from all testable streams
        self.select_all_streams_and_fields(
            conn_id=conn_id, catalogs=test_catalogs, select_all_fields=select_all_fields
        )

        catalogs = menagerie.get_catalogs(conn_id)

        # Ensure our selection affects the catalog
        expected_selected = [tc.get('tap_stream_id') for tc in test_catalogs]
        for cat in catalogs:
            catalog_entry = menagerie.get_annotated_schema(conn_id, cat['stream_id'])

            # Verify all testable streams are selected
            selected = catalog_entry.get('annotated-schema').get('selected')
            LOGGER.info("Validating selection on %s: %s", cat['stream_name'], selected)
            if cat['stream_name'] not in expected_selected:
                self.assertFalse(selected, msg="Stream selected, but not testable.")
                continue # Skip remaining assertions if we aren't selecting this stream
            self.assertTrue(selected, msg="Stream not selected.")

            if select_all_fields:
                # Verify all fields within each selected stream are selected
                for field, field_props in catalog_entry.get('annotated-schema').get('properties').items():
                    field_selected = field_props.get('selected')
                    LOGGER.info("\tValidating selection on %s.%s: %s",
                                cat['stream_name'], field, field_selected)
                    self.assertTrue(field_selected, msg="Field not selected.")
            else:
                # Verify only automatic fields are selected
                expected_automatic_fields = self.expected_automatic_fields().get(cat['tap_stream_id'])
                selected_fields = self.get_selected_fields_from_metadata(catalog_entry['metadata'])
                self.assertEqual(expected_automatic_fields, selected_fields)

    @staticmethod
    def get_selected_fields_from_metadata(metadata):
        selected_fields = set()
        for field in metadata:
            is_field_metadata = len(field['breadcrumb']) > 1
            if field['metadata'].get('inclusion') is None and is_field_metadata:  # BUG_SRCE-4313 remove when addressed
                LOGGER.info("Error %s has no inclusion key in metadata", field)  # BUG_SRCE-4313 remove when addressed
                continue  # BUG_SRCE-4313 remove when addressed
            inclusion_automatic_or_selected = (
                field['metadata']['selected'] is True or \
                field['metadata']['inclusion'] == 'automatic'
            )
            if is_field_metadata and inclusion_automatic_or_selected:
                selected_fields.add(field['breadcrumb'][1])
        return selected_fields


    @staticmethod
    def select_all_streams_and_fields(conn_id, catalogs, select_all_fields: bool = True):
        """Select all streams and all fields within streams"""
        for catalog in catalogs:
            schema = menagerie.get_annotated_schema(conn_id, catalog['stream_id'])

            non_selected_properties = []
            if not select_all_fields:
                # get a list of all properties so that none are selected
                non_selected_properties = schema.get('annotated-schema', {}).get(
                    'properties', {}).keys()

            connections.select_catalog_and_fields_via_metadata(
                conn_id, catalog, schema, [], non_selected_properties)

    def set_replication_methods(self, conn_id, catalogs, replication_methods):

        replication_keys = self.expected_replication_keys()

        for catalog in catalogs:

            replication_method = replication_methods.get(catalog['stream_name'])

            if replication_method == self.INCREMENTAL:
                replication_key = list(replication_keys.get(catalog['stream_name']))[0]
                replication_md = [{ "breadcrumb": [], "metadata": {'replication-key': replication_key, "replication-method" : replication_method, "selected" : True}}]
            else:
                replication_md = [{ "breadcrumb": [], "metadata": {'replication-key': None, "replication-method" : "FULL_TABLE", "selected" : True}}]

            connections.set_non_discoverable_metadata(
                conn_id, catalog, menagerie.get_annotated_schema(conn_id, catalog['stream_id']), replication_md)

    @staticmethod
    def parse_date(date_value):
        """
        Pass in string-formatted-datetime, parse the value, and return it as an unformatted datetime object.
        """
        try:
            date_stripped = dt.strptime(date_value, "%Y-%m-%dT%H:%M:%S.%fZ")
            return date_stripped
        except ValueError:
            try:
                date_stripped = dt.strptime(date_value, "%Y-%m-%dT%H:%M:%SZ")
                return date_stripped
            except ValueError:
                try:
                    date_stripped = dt.strptime(date_value, "%Y-%m-%dT%H:%M:%S.%f+00:00")
                    return date_stripped
                except ValueError:
                    try:
                        date_stripped = dt.strptime(date_value, "%Y-%m-%dT%H:%M:%S+00:00")
                        return date_stripped
                    except ValueError as e_final:
                        raise NotImplementedError("We are not accounting for dates of this format: {}".format(date_value)) from e_final

    def timedelta_formatted(self, dtime, days=0):
        try:
            date_stripped = dt.strptime(dtime, self.START_DATE_FORMAT)
            return_date = date_stripped + timedelta(days=days)

            return dt.strftime(return_date, self.START_DATE_FORMAT)

        except ValueError:
            try:
                date_stripped = dt.strptime(dtime, self.BOOKMARK_COMPARISON_FORMAT)
                return_date = date_stripped + timedelta(days=days)

                return dt.strftime(return_date, self.BOOKMARK_COMPARISON_FORMAT)

            except ValueError:
                return Exception("Datetime object is not of the format: {}".format(self.START_DATE_FORMAT))

    ##########################################################################
    ### Tap Specific Methods
    ##########################################################################

    @staticmethod
    def get_unsupported_by_rest_api():
        """The streams listed here are not supported by the REST API"""
        unsupported_streams = {
            'Announcement',
            'CollaborationGroupRecord',
            'ContentDocumentLink',
            'ContentFolderMember',
            'DataStatistics',
            'EntityParticle',
            'FieldDefinition',
            'FlexQueueItem',
            'IdeaComment',
            'OwnerChangeOptionInfo',
            'PicklistValueInfo',
            'PlatformAction',
            'RelationshipDomain',
            'RelationshipInfo',
            'SearchLayout',
            'SiteDetail',
            'UserEntityAccess',
            'UserFieldAccess',
            'Vote',
            'RecordActionHistory',
            'FlowVersionView',
            'FlowVariableView',
            'AppTabMember',
            'ColorDefinition',
            'IconDefinition',
        }

        return unsupported_streams

    def get_unsupported_by_bulk_api(self):
        unsupported_streams_rest = self.get_unsupported_by_rest_api()
        unsupported_streams_bulk_only= {
            'AcceptedEventRelation',
            'AssetTokenEvent',
            'AttachedContentNote',
            'CaseStatus',
            'ContentFolderItem',
            'ContractStatus',
            'DeclinedEventRelation',
            'EventWhoRelation',
            'PartnerRole',
            'QuoteTemplateRichTextData',
            'RecentlyViewed',
            'SolutionStatus',
            'TaskPriority',
            'TaskWhoRelation',
            'TaskStatus',
            'UndecidedEventRelation',
            'OrderStatus',
            'WorkOrderStatus',
            'WorkOrderLineItemStatus',
            'ServiceAppointmentStatus',
            'ServiceAppointmentStatus',
            'FieldSecurityClassification',
            # BUG_TODO | the following streams are undocumented
            'WorkStepStatus',
            'ShiftStatus',
        }

        return unsupported_streams_bulk_only | unsupported_streams_rest

    def is_unsupported_by_rest_api(self, stream):
        """returns True if stream is unsupported by REST API"""

        return stream in self.get_unsupported_by_rest_api()

    def is_unsupported_by_bulk_api(self, stream):
        """
        returns True if stream is unsupported by BULK API

        BULK API does not support any streams that are unsupported by the REST API and
        in addition does not support the streams listed below.
        """
        return stream in self.get_unsupported_by_bulk_api()
