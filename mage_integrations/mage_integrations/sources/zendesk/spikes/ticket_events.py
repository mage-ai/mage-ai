#!/usr/bin/env python
import logging
import requests
import pytz
import sys
import argparse
from statistics import mean
from collections import defaultdict
from datetime import datetime
logging.basicConfig(level=logging.INFO)
parser = argparse.ArgumentParser()
parser.add_argument("--debug", help="Turn on the scripts internal debug logs",
                   action='store_true')
parser.add_argument("--log-requests", help="Turn on request loggging",
                   action='store_true')
parser.add_argument("--audits", help="Also sync all ticket audits",
                   action='store_true')
parser.add_argument("--metrics", help="Also sync all ticket metrics",
                   action='store_true')
parser.add_argument("--comments", help="Also sync all ticket comments",
                   action='store_true')
parser.add_argument("run_length", help="Number of minutes to run for",
                   type=int)
parser.add_argument("oauth_token")
parser.add_argument("subdomain")
args = parser.parse_args()
logger = logging.getLogger(__name__)
if args.debug:
   logging.getLogger('urllib3').setLevel(logging.DEBUG)
   logging.getLogger('zenpy').setLevel(logging.DEBUG)
   logging.getLogger('zenpy.lib.cache').setLevel(logging.WARN)
   logger.setLevel(logging.DEBUG)

if args.log_requests:
   logging.getLogger('urllib3').setLevel(logging.DEBUG)
   logging.getLogger('zenpy').setLevel(logging.DEBUG)
   logging.getLogger('zenpy.lib.cache').setLevel(logging.WARN)
# Here to make it obvious that you'll get logs from urllib3
requests.get('https://example.org')
from http.client import HTTPConnection
import zenpy
client = zenpy.Zenpy(oauth_token=args.oauth_token, subdomain=args.subdomain)
bookmark = datetime.strptime(
   "2018-06-16T13:10:06+0000",
   '%Y-%m-%dT%H:%M:%S%z').astimezone(pytz.UTC)
start_time = datetime.utcnow()
rates = defaultdict(list)
metrics_start_time = datetime.utcnow()
capture_rate = 60
raw_counts = defaultdict(int)
def log_rates(rates):
   global metrics_start_time
   global start_time
   for metric, value in rates.items():
       logger.info("Synced average of %s %ss per %s seconds",
                   mean(value),
                   metric,
                   capture_rate)
       logger.info("Synced minimum of %s %ss per %s seconds",
                   min(value),
                   metric,
                   capture_rate)
       logger.info("Synced max of %s %ss per %s seconds",
                   max(value),
                   metric,
                   capture_rate)
       logger.info("Synced total of %s %ss in %s seconds",
                   sum(value),
                   metric,
                   (datetime.utcnow() - start_time).seconds)

def capture(metric):
   global metrics_start_time
   global rates
   raw_counts[metric] += 1
   logger.debug("Capturing %s", metric)
   if capture_rate <= (datetime.utcnow() - metrics_start_time).seconds:
       for metric in raw_counts.keys():
           rates[metric] += [raw_counts[metric]]
           raw_counts[metric] = 0
       log_rates(rates)
       metrics_start_time = datetime.utcnow()
   current_run_length = (datetime.utcnow() - start_time).seconds
   if (args.run_length * 60) < current_run_length:
       logger.info("Ran for %s seconds. Emitting final metrics.",
                   current_run_length)
       log_rates(rates)
       sys.exit(0)
logger.info("Syncing data for %d minutes. Will emit stats every %d seconds",
           args.run_length,
           capture_rate)

# for ticket in client.tickets.incremental(start_time=bookmark): #, include=['last_audits']):
#    capture('ticket')
#    if args.audits:
#       for audit in client.tickets.audits(ticket=ticket.id):
#          import ipdb; ipdb.set_trace()
#          1+1
#          capture('audit')
#    if args.metrics:
#       # This returns a single object
#       client.tickets.metrics(ticket=ticket.id)
#       capture('metric')

#    if args.comments:
#       for comment in client.tickets.comments(ticket=ticket.id):
#          capture('comment')

# Here is a ticket and here is what the shape of these things looks like.
ticket = client.tickets(id=1234)
import json
print('audits')
for audit in client.tickets.audits(ticket=ticket.id):
   import ipdb; ipdb.set_trace()
   1+1
   print(audit.to_dict().keys())

print('metrics')
print(client.tickets.metrics(ticket=ticket.id).to_dict().keys())

print('comments')
for comment in client.tickets.comments(ticket=ticket.id):
   print(comment.to_dict().keys())

# Both calls below appear to show that we could remove the nested code of Tickets and their Comments, Audits, and Metrics.

# Needs a newer version of Zenpy, but this might yield an issue with pytz and singer-python. This spike used version 2.0.11

# Ticket Events Export appears to output Audits and if you sideload comment_events via include you also get comments.
for ticket_event in client.tickets.events(start_time=1498775400, include=['comment_events']):
   import ipdb; ipdb.set_trace()
   1+1

# Listing Ticket Metric Events retrieves metrics.
for ticket_metric in client.tickets.metrics_incremental(start_time=1498775400):
   import ipdb; ipdb.set_trace()
   1+1

