#!/usr/bin/env python3


import copy
import json
import os
import random
from subprocess import Popen, PIPE
import sys
import tempfile
import time

import singer
from singer import utils
import tap_facebook

LOGGER = singer.get_logger()

ALL_FIELDS = [
    "account_id",
    "account_name",
    "action_values",
    "actions",
    "ad_id",
    "ad_name",
    "adset_id",
    "adset_name",
    "app_store_clicks",
    "call_to_action_clicks",
    "campaign_id",
    "campaign_name",
    "canvas_avg_view_percent",
    "canvas_avg_view_time",
    "clicks",
    "conversion_rate_ranking",
    "cost_per_action_type",
    "cost_per_inline_link_click",
    "cost_per_inline_post_engagement",
    "cost_per_total_action",
    "cost_per_unique_action_type",
    "cost_per_unique_click",
    "cost_per_unique_inline_link_click",
    "cpc",
    "cpm",
    "cpp",
    "ctr",
    "date_start",
    "date_stop",
    "deeplink_clicks",
    "engagement_rate_ranking",
    "frequency",
    "impressions",
    "inline_link_click_ctr",
    "inline_link_clicks",
    "inline_post_engagement",
    "newsfeed_avg_position",
    "newsfeed_clicks",
    "newsfeed_impressions",
    "objective",
    "quality_ranking",
    "reach",
    "social_clicks",
    "social_impressions",
    "social_reach",
    "social_spend",
    "spend",
    "total_actions",
    "total_unique_actions",
    "unique_actions",
    "unique_clicks",
    "unique_ctr",
    "unique_impressions",
    "unique_inline_link_click_ctr",
    "unique_inline_link_clicks",
    "unique_link_clicks_ctr",
    "unique_social_clicks",
    "unique_social_impressions",
    "website_clicks",
    "website_ctr",
]

NO_ACTIONS = [
    "account_id",
    "account_name",
    "ad_id",
    "ad_name",
    "adset_id",
    "adset_name",
    "app_store_clicks",
    "call_to_action_clicks",
    "campaign_id",
    "campaign_name",
    "canvas_avg_view_percent",
    "canvas_avg_view_time",
    "clicks",
    "conversion_rate_ranking",
    "cost_per_inline_link_click",
    "cost_per_inline_post_engagement",
    "cost_per_total_action",
    "cost_per_unique_click",
    "cost_per_unique_inline_link_click",
    "cpc",
    "cpm",
    "cpp",
    "ctr",
    "date_start",
    "date_stop",
    "deeplink_clicks",
    "engagement_rate_ranking",
    "frequency",
    "impressions",
    "inline_link_click_ctr",
    "inline_link_clicks",
    "inline_post_engagement",
    "newsfeed_avg_position",
    "newsfeed_clicks",
    "newsfeed_impressions",
    "objective",
    "quality_ranking",
    "reach",
    "social_clicks",
    "social_impressions",
    "social_reach",
    "social_spend",
    "spend",
    "total_actions",
    "total_unique_actions",
    "unique_clicks",
    "unique_ctr",
    "unique_impressions",
    "unique_inline_link_click_ctr",
    "unique_inline_link_clicks",
    "unique_link_clicks_ctr",
    "unique_social_clicks",
    "unique_social_impressions",
    "website_clicks",
]

COMMON_FIELDS = [
    "account_id",
    "account_name",
    "ad_id",
    "ad_name",
    "adset_id",
    "adset_name",
    "call_to_action_clicks",
    "campaign_id",
    "campaign_name",
    "canvas_avg_view_percent",
    "canvas_avg_view_time",
    "clicks",
    "cost_per_inline_link_click",
    "cost_per_inline_post_engagement",
    "cost_per_total_action",
    "cpc",
    "cpm",
    "cpp",
    "ctr",
    "date_start",
    "date_stop",
    "deeplink_clicks",
    "frequency",
    "impressions",
    "inline_link_click_ctr",
    "inline_link_clicks",
    "inline_post_engagement",
    "objective",
    "reach",
    "social_clicks",
    "social_impressions",
    "social_reach",
    "spend",
    "total_actions",
    "unique_clicks",
    "website_clicks",
]

NO_AGGREGATES_OR_UNIQUES = [
    "account_id",
    "account_name",
    "action_values",
    "actions",
    "ad_id",
    "ad_name",
    "adset_id",
    "adset_name",
    "app_store_clicks",
    "call_to_action_clicks",
    "campaign_id",
    "campaign_name",
    "clicks",
    "conversion_rate_ranking",
    "date_start",
    "date_stop",
    "deeplink_clicks",
    "engagement_rate_ranking",
    "frequency",
    "impressions",
    "inline_link_clicks",
    "inline_post_engagement",
    "newsfeed_avg_position",
    "newsfeed_clicks",
    "newsfeed_impressions",
    "objective",
    "quality_ranking",
    "reach",
    "social_clicks",
    "social_impressions",
    "social_reach",
    "social_spend",
    "spend",
    "total_actions",
    "website_clicks",
]

FIELD_SETS = {
    'no_actions': NO_ACTIONS,
    'all_fields': ALL_FIELDS,
    'common_fields': COMMON_FIELDS,
    'no_aggregates_or_uniques': NO_AGGREGATES_OR_UNIQUES
}

def random_subset(values):
    res = []
    for value in values:
        if random.random() > 0.5:
            res.append(value)
    return res

def gen_level():
    # return random.choice(['ad', 'campaign'])
    return 'ad'

def gen_action_breakdowns():
    # default is action_type
    return random_subset([
        'action_type',
        'action_target_id',
        'action_destination'])

def gen_breakdowns():
    return random.choice([None,
                          ['age', 'gender'],
                          ['country'],
                          ['placement', 'impression_device']])

def gen_action_attribution_windows():
    # default is 1d_view, 28d_click
    # None if no action breakdown
    return random_subset(tap_facebook.ALL_ACTION_ATTRIBUTION_WINDOWS)

def write_configs_and_run_tap(config_dir, config, table, field_set_name, fields):
    props_path = os.path.join(config_dir, 'properties.json')
    config_path = os.path.join(config_dir, 'config.json')

    with open(config_path, 'w') as out:
        json.dump(config, out)
    with open(props_path, 'w') as out:
        props = {
            'streams': {
                'adsinsights': {
                    'selected': True,
                    'properties': {k: {'selected': True} for k in fields}
                }
            }
        }
        json.dump(props, out)

    run_tap(config_path, props_path, table, field_set_name, fields)


def run_tap(config_path, props_path, table, field_set_name, fields):

    start_time = time.time()
    cmd = ['tap-facebook', '--config', config_path, '--properties', props_path]
    tap = Popen(cmd,
                stdout=PIPE,
                bufsize=1,
                universal_newlines=True)

    record = None
    LOGGER.debug("Stdout reader starting")
    for raw_line in tap.stdout:
        LOGGER.debug('Got a line')
        for line in raw_line.splitlines():
            message = json.loads(line)
            if message['type'] == 'RECORD':
                record = message['record']
    returncode = tap.wait(5)
    return {
        'table': table,
        'fields': fields,
        'field_set_name': field_set_name,
        'return_code': returncode,
        'duration': time.time() - start_time,
        'record': record
    }

def main():
    args = utils.parse_args(tap_facebook.REQUIRED_CONFIG_KEYS)

    with tempfile.TemporaryDirectory(prefix='insights-experiment-') as config_dir:

        while True:
            level = gen_level()
            breakdowns = gen_breakdowns()
            action_breakdowns = gen_action_breakdowns()
            if not action_breakdowns:
                action_attribution_windows = []
            else:
                action_attribution_windows = gen_action_attribution_windows()
            table = {
                'level': level,
                'action_breakdowns': action_breakdowns,
                'breakdowns': breakdowns,
                'action_attribution_windows': action_attribution_windows
            }
            field_set_name = random.choice(list(FIELD_SETS.keys()))
            fields = FIELD_SETS[field_set_name]
            config = copy.deepcopy(args.config)
            # config['insights_tables'] = [table]  Don't vary config right now
            result = run_tap(config_dir, config, table, field_set_name, fields)

            json.dump(result, sys.stdout)
            print("")
            sys.stdout.flush()


if __name__ == '__main__':
    main()
