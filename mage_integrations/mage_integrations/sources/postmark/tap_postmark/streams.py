"""Streams metadata."""
# -*- coding: utf-8 -*-
from datetime import datetime
from types import MappingProxyType

from dateutil.parser import parse as parse_date

# Helper constants for timezone parsing
HOUR: int = 3600
TIMEZONES: MappingProxyType = MappingProxyType({
    'A': HOUR,
    'ACDT': 10.5 * HOUR,  # noqa: WPS432
    'ACST': 9.5 * HOUR,  # noqa: WPS432
    'ACT': -5 * HOUR,  # noqa: WPS432
    'ACWST': 8.75 * HOUR,  # noqa: WPS432
    'ADT': 4 * HOUR,  # noqa: WPS432
    'AEDT': 11 * HOUR,  # noqa: WPS432
    'AEST': 10 * HOUR,  # noqa: WPS432
    'AET': 10 * HOUR,
    'AFT': 4.5 * HOUR,  # noqa: WPS432
    'AKDT': -8 * HOUR,
    'AKST': -9 * HOUR,
    'ALMT': 6 * HOUR,  # noqa: WPS432
    'AMST': -3 * HOUR,  # noqa: WPS432
    'AMT': -4 * HOUR,  # noqa: WPS432
    'ANAST': 12 * HOUR,  # noqa: WPS432
    'ANAT': 12 * HOUR,  # noqa: WPS432
    'AQTT': 5 * HOUR,  # noqa: WPS432
    'ART': -3 * HOUR,
    'AST': 3 * HOUR,  # noqa: WPS432
    'AT': -4 * HOUR,
    'AWDT': 9 * HOUR,  # noqa: WPS432
    'AWST': 8 * HOUR,  # noqa: WPS432
    'AZOST': 0,
    'AZOT': -1 * HOUR,
    'AZST': 5 * HOUR,
    'AZT': 4 * HOUR,
    'AoE': -12 * HOUR,  # noqa: WPS432
    'B': 2 * HOUR,
    'BNT': 8 * HOUR,
    'BOT': -4 * HOUR,
    'BRST': -2 * HOUR,
    'BRT': -3 * HOUR,
    'BST': 6 * HOUR,
    'BTT': 6 * HOUR,
    'C': 3 * HOUR,
    'CAST': 8 * HOUR,
    'CAT': 2 * HOUR,
    'CCT': 6.5 * HOUR,  # noqa: WPS432
    'CDT': -5 * HOUR,
    'CEST': 2 * HOUR,
    'CET': HOUR,
    'CHADT': 13.75 * HOUR,  # noqa: WPS432
    'CHAST': 12.75 * HOUR,  # noqa: WPS432
    'CHOST': 9 * HOUR,
    'CHOT': 8 * HOUR,
    'CHUT': 10 * HOUR,
    'CIDST': -4 * HOUR,
    'CIST': -5 * HOUR,
    'CKT': -10 * HOUR,
    'CLST': -3 * HOUR,
    'CLT': -4 * HOUR,
    'COT': -5 * HOUR,
    'CST': -6 * HOUR,
    'CT': -6 * HOUR,
    'CVT': -1 * HOUR,
    'CXT': 7 * HOUR,
    'ChST': 10 * HOUR,
    'D': 4 * HOUR,
    'DAVT': 7 * HOUR,
    'DDUT': 10 * HOUR,
    'E': 5 * HOUR,
    'EASST': -5 * HOUR,
    'EAST': -6 * HOUR,
    'EAT': 3 * HOUR,
    'ECT': -5 * HOUR,
    'EDT': -4 * HOUR,
    'EEST': 3 * HOUR,
    'EET': 2 * HOUR,
    'EGST': 0,
    'EGT': -1 * HOUR,
    'EST': -5 * HOUR,
    'ET': -5 * HOUR,
    'F': 6 * HOUR,
    'FET': 3 * HOUR,
    'FJST': 13 * HOUR,  # noqa: WPS432
    'FJT': 12 * HOUR,  # noqa: WPS432
    'FKST': -3 * HOUR,
    'FKT': -4 * HOUR,
    'FNT': -2 * HOUR,
    'G': 7 * HOUR,
    'GALT': -6 * HOUR,
    'GAMT': -9 * HOUR,
    'GET': 4 * HOUR,
    'GFT': -3 * HOUR,
    'GILT': 12 * HOUR,  # noqa: WPS432
    'GMT': 0,
    'GST': 4 * HOUR,
    'GYT': -4 * HOUR,
    'H': 8 * HOUR,
    'HDT': -9 * HOUR,
    'HKT': 8 * HOUR,
    'HOVST': 8 * HOUR,
    'HOVT': 7 * HOUR,
    'HST': -10 * HOUR,
    'I': 9 * HOUR,
    'ICT': 7 * HOUR,
    'IDT': 3 * HOUR,
    'IOT': 6 * HOUR,
    'IRDT': 4.5 * HOUR,  # noqa: WPS432
    'IRKST': 9 * HOUR,
    'IRKT': 8 * HOUR,
    'IRST': 3.5 * HOUR,  # noqa: WPS432
    'IST': 5.5 * HOUR,  # noqa: WPS432
    'JST': 9 * HOUR,
    'K': 10 * HOUR,
    'KGT': 6 * HOUR,
    'KOST': 11 * HOUR,  # noqa: WPS432
    'KRAST': 8 * HOUR,
    'KRAT': 7 * HOUR,
    'KST': 9 * HOUR,
    'KUYT': 4 * HOUR,
    'L': 11 * HOUR,  # noqa: WPS432
    'LHDT': 11 * HOUR,  # noqa: WPS432
    'LHST': 10.5 * HOUR,  # noqa: WPS432
    'LINT': 14 * HOUR,  # noqa: WPS432
    'M': 12 * HOUR,  # noqa: WPS432
    'MAGST': 12 * HOUR,  # noqa: WPS432
    'MAGT': 11 * HOUR,  # noqa: WPS432
    'MART': 9.5 * HOUR,  # noqa: WPS432
    'MAWT': 5 * HOUR,
    'MDT': -6 * HOUR,
    'MHT': 12 * HOUR,  # noqa: WPS432
    'MMT': 6.5 * HOUR,  # noqa: WPS432
    'MSD': 4 * HOUR,
    'MSK': 3 * HOUR,
    'MST': -7 * HOUR,
    'MT': -7 * HOUR,
    'MUT': 4 * HOUR,
    'MVT': 5 * HOUR,
    'MYT': 8 * HOUR,
    'N': -1 * HOUR,
    'NCT': 11 * HOUR,  # noqa: WPS432
    'NDT': 2.5 * HOUR,  # noqa: WPS432
    'NFT': 11 * HOUR,  # noqa: WPS432
    'NOVST': 7 * HOUR,
    'NOVT': 7 * HOUR,
    'NPT': 5.5 * HOUR,  # noqa: WPS432
    'NRT': 12 * HOUR,  # noqa: WPS432
    'NST': 3.5 * HOUR,  # noqa: WPS432
    'NUT': -11 * HOUR,  # noqa: WPS432
    'NZDT': 13 * HOUR,  # noqa: WPS432
    'NZST': 12 * HOUR,  # noqa: WPS432
    'O': -2 * HOUR,
    'OMSST': 7 * HOUR,
    'OMST': 6 * HOUR,
    'ORAT': 5 * HOUR,
    'P': -3 * HOUR,
    'PDT': -7 * HOUR,
    'PET': -5 * HOUR,
    'PETST': 12 * HOUR,  # noqa: WPS432
    'PETT': 12 * HOUR,  # noqa: WPS432
    'PGT': 10 * HOUR,
    'PHOT': 13 * HOUR,  # noqa: WPS432
    'PHT': 8 * HOUR,
    'PKT': 5 * HOUR,
    'PMDT': -2 * HOUR,
    'PMST': -3 * HOUR,
    'PONT': 11 * HOUR,  # noqa: WPS432
    'PST': -8 * HOUR,
    'PT': -8 * HOUR,
    'PWT': 9 * HOUR,
    'PYST': -3 * HOUR,
    'PYT': -4 * HOUR,
    'Q': -4 * HOUR,
    'QYZT': 6 * HOUR,
    'R': -5 * HOUR,
    'RET': 4 * HOUR,
    'ROTT': -3 * HOUR,
    'S': -6 * HOUR,
    'SAKT': 11 * HOUR,  # noqa: WPS432
    'SAMT': 4 * HOUR,
    'SAST': 2 * HOUR,
    'SBT': 11 * HOUR,  # noqa: WPS432
    'SCT': 4 * HOUR,
    'SGT': 8 * HOUR,
    'SRET': 11 * HOUR,  # noqa: WPS432
    'SRT': -3 * HOUR,
    'SST': -11 * HOUR,  # noqa: WPS432
    'SYOT': 3 * HOUR,
    'T': -7 * HOUR,
    'TAHT': -10 * HOUR,
    'TFT': 5 * HOUR,
    'TJT': 5 * HOUR,
    'TKT': 13 * HOUR,  # noqa: WPS432
    'TLT': 9 * HOUR,
    'TMT': 5 * HOUR,
    'TOST': 14 * HOUR,  # noqa: WPS432
    'TOT': 13 * HOUR,  # noqa: WPS432
    'TRT': 3 * HOUR,
    'TVT': 12 * HOUR,  # noqa: WPS432
    'U': -8 * HOUR,
    'ULAST': 9 * HOUR,
    'ULAT': 8 * HOUR,
    'UTC': 0,
    'UYST': -2 * HOUR,
    'UYT': -3 * HOUR,
    'UZT': 5 * HOUR,
    'V': -9 * HOUR,
    'VET': -4 * HOUR,
    'VLAST': 11 * HOUR,  # noqa: WPS432
    'VLAT': 10 * HOUR,
    'VOST': 6 * HOUR,
    'VUT': 11 * HOUR,  # noqa: WPS432
    'W': -10 * HOUR,
    'WAKT': 12 * HOUR,  # noqa: WPS432
    'WARST': -3 * HOUR,
    'WAST': 2 * HOUR,
    'WAT': HOUR,
    'WEST': HOUR,
    'WET': 0,
    'WFT': 12 * HOUR,  # noqa: WPS432
    'WGST': -2 * HOUR,
    'WGT': -3 * HOUR,
    'WIB': 7 * HOUR,
    'WIT': 9 * HOUR,
    'WITA': 8 * HOUR,
    'WST': 14 * HOUR,  # noqa: WPS432
    'WT': 0,
    'X': -11 * HOUR,  # noqa: WPS432
    'Y': -12 * HOUR,  # noqa: WPS432
    'YAKST': 10 * HOUR,
    'YAKT': 9 * HOUR,
    'YAPT': 10 * HOUR,
    'YEKST': 6 * HOUR,
    'YEKT': 5 * HOUR,
    'Z': 0,
})


def date_parser(input_date: str) -> str:
    """Help function to parse timezones correctly in strings.

    Arguments:
        input_date {str} -- Input date as string

    Returns:
        {str} -- Date in isoformat
    """
    parsed_date: datetime = parse_date(input_date, tzinfos=TIMEZONES)
    return parsed_date.isoformat()


# Streams metadata
STREAMS: MappingProxyType = MappingProxyType({
    'messages_outbound': {
        'key_properties': 'id',
        'replication_method': 'INCREMENTAL',
        'replication_key': 'date',
        'bookmark': 'start_date',
        'mapping': {
            'date': {
                'map': 'date', 'null': False,
            },
            'Bcc': {
                'map': 'bcc', 'null': True,
            },
            'Cc': {
                'map': 'cc', 'null': True,
            },
            'From': {
                'map': 'from', 'null': False,
            },
            'MessageID': {
                'map': 'message_id', 'null': False,
            },
             'MessageEvents': {
                'map': 'message_events',  'null': False,
            },
            'MessageStream': {
                'map': 'message_stream', 'null': False,
            },
            'ReceivedAt': {
                'map': 'received_at', 'null': False,
            },
            'Recipients': {
                'map': 'recipients', 'null': False,
            },
            'Status': {
                'map': 'status', 'null': False,
            },
            'To': {
                'map': 'to', 'null': True,
            },
            'TrackLinks': {
                'map': 'track_links', 'null': True,
            },
            'TrackOpens': {
                'map': 'track_opens', 'null': True,
            },
            'Subject' : {
                'map': 'subject', 'null': True, 
            },
        }
    },
    'messages_opens': {
        'key_properties': 'id',
        'replication_method': 'INCREMENTAL',
        'replication_key': 'date',
        'bookmark': 'start_date',
        'mapping': {
            'date': {
                'map': 'date', 'null': False,
            },
            'FirstOpen': {
                'map': 'first_open', 'null': True,
            },
            'Client_Name': {
                'map': 'client_name', 'null': True,
            },
            'Client_Company': {
                'map': 'client_company', 'null': True,
            },
            'Client_Family': {
                'map': 'client_family', 'null': True,
            },
            'OS_Name': {
                'map': 'os_name', 'null': True,
            },
            'OS_Company': {
                'map': 'os_company', 'null': True,
            },
            'OS_Family': {
                'map': 'os_family', 'null': True,
            },
            'Platform': {
                'map': 'platform', 'null': True,
            },
            'UserAgent': {
                'map': 'user_agent', 'null': True,
            },
            'Geo_CountryISOCode': {
                'map': 'geo_countryisocode', 'null': True,
            },
            'Geo_Country': {
                'map': 'geo_country', 'null': True,
            },
            'Geo_RegionISOCode': {
                'map': 'geo_regionisocode', 'null': True,
            },
            'Geo_Region': {
                'map': 'geo_region', 'null': True,
            },
            'Geo_City': {
                'map': 'geo_city', 'null': True,
            },
            'Geo_Zip': {
                'map': 'geo_zip', 'null': True,
            },
            'Geo_Coords': {
                'map': 'geo_coords', 'null': True,
            },
            'Geo_IP': {
                'map': 'geo_ip', 'null': True,
            },
            'MessageID': {
                'map': 'message_id', 'null': False,
            },
            'MessageStream': {
                'map': 'message_stream', 'null': False,
            },
            'ReceivedAt': {
                'map': 'received_at', 'null': False,
            },
            'Tag': {
                'map': 'tag', 'null': True,
            },
            'Recipient': {
                'map': 'recipient', 'null': False,
            },
        }
    },
    'stats_outbound_bounces': {
        'key_properties': 'id',
        'replication_method': 'INCREMENTAL',
        'replication_key': 'date',
        'bookmark': 'start_date',
        'mapping': {
            'id': {
                'map': 'id', 'type': int, 'null': False,
            },
            'date': {
                'map': 'date',
            },
            'AutoResponder': {
                'map': 'autoresponder', 'type': int, 'null': True,
            },
            'Blocked': {
                'map': 'blocked', 'type': int, 'null': True,
            },
            'DnsError': {
                'map': 'dnserror', 'type': int, 'null': True,
            },
            'HardBounce': {
                'map': 'hardbounce', 'type': int, 'null': True,
            },
            'SMTPApiError': {
                'map': 'smtp_api_error', 'type': int, 'null': True,
            },
            'SoftBounce': {
                'map': 'softbounce', 'type': int, 'null': True,
            },
            'SpamNotification': {
                'map': 'spamnotification', 'type': int, 'null': True,
            },
            'Transient': {
                'map': 'transient', 'type': int, 'null': True,
            },
            'Unknown': {
                'map': 'unknown', 'type': int, 'null': True,
            }
        },
    },
    'stats_outbound_clients': {
        'key_properties': 'id',
        'replication_method': 'INCREMENTAL',
        'replication_key': 'date',
        'bookmark': 'start_date',
        'mapping': {
            'date': {
                'map': 'date',
            },
            'client_type': {
                'map': 'client_type', 'null': False,
            },
            'count': {
                'map': 'count', 'null': False,
            },
        },
    },
    'stats_outbound_platform': {
        'key_properties': 'id',
        'replication_method': 'INCREMENTAL',
        'replication_key': 'date',
        'bookmark': 'start_date',
        'mapping': {
            'id': {
                'map': 'id', 'type': int, 'null': False,
            },
            'date': {
                'map': 'date',
            },
            'Desktop': {
                'map': 'desktop', 'type': int, 'null': True,
            },
            'Mobile': {
                'map': 'mobile', 'type': int, 'null': True,
            },
            'Unknown': {
                'map': 'unknown', 'type': int, 'null': True,
            },
            'WebMail': {
                'map': 'webmail', 'type': int, 'null': True,
            },
        },
    },
    'stats_outbound_overview': {
        'key_properties': 'id',
        'replication_method': 'INCREMENTAL',
        'replication_key': 'date',
        'bookmark': 'start_date',
        'mapping': {
            'date': {
                'map': 'date',
            },
            'id': {
                'map': 'id', 'null': False,
            },
            'Sent': {
                'map': 'sent', 'type': int, 'null': False,
            },
            'Bounced': {
                'map': 'bounced', 'type': int, 'null': False,
            },
            'SMTPApiErrors': {
                'map': 'smtp_api_errors', 'type': int, 'null': False,
            },
            'BounceRate': {
                'map': 'bouncerate', 'null': False,
            },
            'SpamComplaints': {
                'map': 'spamcomplaints', 'type': int, 'null': False,
            },
            'SpamComplaintsRate': {
                'map': 'spamcomplaints_rate', 'null': False,
            },
            'Tracked': {
                'map': 'tracked', 'type': int, 'null': False,
            },
            'Opens': {
                'map': 'opens', 'type': int, 'null': False,
            },
            'UniqueOpens': {
                'map': 'unique_opens', 'type': int, 'null': False,
            },
            'TotalClicks': {
                'map': 'totalclicks', 'type': int, 'null': False,
            },
            'UniqueLinksClicked': {
                'map': 'unique_linksclicked', 'type': int, 'null': False,
            },
            'WithClientRecorded': {
                'map': 'with_client_recorded', 'type': int, 'null': False,
            },
            'WithPlatformRecorded': {
                'map': 'with_platform_recorded', 'type': int, 'null': False,
            },
            'WithReadTimeRecorded': {
                'map': 'with_readtime_recorded', 'type': int, 'null': False,
            },
            'WithLinkTracking': {
                'map': 'with_linktracking', 'type': int, 'null': False,
            },
            'WithOpenTracking': {
                'map': 'with_opentracking', 'type': int, 'null': False,
            },
            'TotalTrackedLinksSent': {
                'map': 'total_tracked_links_sent', 'type': int, 'null': False,
            }
        },
    },
})
