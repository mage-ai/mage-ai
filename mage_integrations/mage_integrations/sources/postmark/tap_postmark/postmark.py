"""PayPal API Client."""  # noqa: WPS226
# -*- coding: utf-8 -*-

import logging
from datetime import date, datetime, timedelta
from types import MappingProxyType
from typing import Callable, List, Generator

import httpx
import singer
from dateutil.rrule import DAILY, rrule

from tap_postmark.cleaners import CLEANERS

# Example URL: https://api.postmarkapp.com/stats/outbound/opens/platforms

API_SCHEME: str = 'https://'
API_BASE_URL: str = 'api.postmarkapp.com'
API_MESSAGES_PATH: str = '/messages'
API_STATS_PATH: str = '/stats'
API_OUTBOUND_PATH: str = '/outbound'
API_OPENS_PATH: str = '/opens'
API_BOUNCE_PATH: str = '/bounces'
API_CLIENTS_PATH: str = '/emailclients'
API_PLATFORM_PATH: str = '/platforms'
API_DATE_PATH: str = '?fromdate=:date:&todate=:date:'

MESSAGES_MAX_HISTORY: timedelta = timedelta(days=45)  # noqa: WPS432

HEADERS: MappingProxyType = MappingProxyType({  # Frozen dictionary
    'Accept': 'application/json',
    'X-Postmark-Server-Token': ':token:',
})


class Postmark(object):  # noqa: WPS230
    """Postmark API Client."""

    def __init__(
        self,
        postmark_server_token: str,
    ) -> None:  # noqa: DAR101
        """Initialize client.

        Arguments:
            postmark_server_token {str} -- Postmark Server Token
        """
        self.postmark_server_token: str = postmark_server_token
        self.logger: logging.Logger = singer.get_logger()
        self.client: httpx.Client = httpx.Client(http2=True)

    def stats_outbound_bounces(  # noqa: WPS210, WPS432
        self,
        **kwargs: dict,
    ) -> Generator[dict, None, None]:  # noqa: DAR101
        """Get all bounce reasons from date.

        Raises:
            ValueError: When the parameter start_date is missing

        Yields:
            Generator[dict] --  Cleaned Bounce Data
        """
        # Validate the start_date value exists
        start_date_input: str = str(kwargs.get('start_date', ''))

        if not start_date_input:
            raise ValueError('The parameter start_date is required.')

        # Get the Cleaner
        cleaner: Callable = CLEANERS.get('postmark_stats_outbound_bounces', {})

        # Create Header with Auth Token
        self._create_headers()

        for date_day in self._start_days_till_now(start_date_input):

            # Replace placeholder in reports path
            from_to_date: str = API_DATE_PATH.replace(
                ':date:',
                date_day,
            )

            self.logger.info(
                f'Recieving Bounce stats from {date_day}'
            )

            # Build URL
            url: str = (
                f'{API_SCHEME}{API_BASE_URL}{API_STATS_PATH}'
                f'{API_OUTBOUND_PATH}{API_BOUNCE_PATH}{from_to_date}'
            )

            # Make the call to Postmark API
            response: httpx._models.Response = self.client.get(  # noqa: WPS437
                url,
                headers=self.headers,
            )

            # Raise error on 4xx and 5xxx
            response.raise_for_status()

            # Create dictionary from response
            response_data: dict = response.json()

            # Yield Cleaned results
            yield cleaner(date_day, response_data)

    def stats_outbound_clients(  # noqa: WPS210, WPS432
        self,
        **kwargs: dict,
    ) -> Generator[dict, None, None]:  # noqa: DAR101
        """Get all clients from date.

        Raises:
            ValueError: When the parameter start_date is missing

        Yields:
            Generator[dict] --  Cleaned Client Data
        """
        # Validate the start_date value exists
        start_date_input: str = str(kwargs.get('start_date', ''))

        if not start_date_input:
            raise ValueError('The parameter start_date is required.')

        # Get the Cleaner
        cleaner: Callable = CLEANERS.get('postmark_stats_outbound_clients', {})

        # Create Header with Auth Token
        self._create_headers()

        for date_day in self._start_days_till_now(start_date_input):

            # Replace placeholder in reports path
            from_to_date: str = API_DATE_PATH.replace(
                ':date:',
                date_day,
            )

            self.logger.info(
                f'Recieving Client stats from {date_day}'
            )

            # Build URL
            url: str = (
                f'{API_SCHEME}{API_BASE_URL}{API_STATS_PATH}'
                f'{API_OUTBOUND_PATH}{API_OPENS_PATH}{API_CLIENTS_PATH}'
                f'{from_to_date}'
            )

            # Make the call to Postmark API
            response: httpx._models.Response = self.client.get(  # noqa: WPS437
                url,
                headers=self.headers,
            )

            # Raise error on 4xx and 5xxx
            response.raise_for_status()

            # Create dictionary from response
            response_data: dict = response.json()

            # Yield Cleaned results
            yield from cleaner(date_day, response_data)

    def stats_outbound_overview(  # noqa: WPS210, WPS432
        self,
        **kwargs: dict,
    ) -> Generator[dict, None, None]:  # noqa: DAR101
        """Get all bounce reasons from date.

        Raises:
            ValueError: When the parameter start_date is missing

        Yields:
            Generator[dict] --  Cleaned Bounce Data
        """
        # Validate the start_date value exists
        start_date_input: str = str(kwargs.get('start_date', ''))

        if not start_date_input:
            raise ValueError('The parameter start_date is required.')

        # Get the Cleaner
        cleaner: Callable = CLEANERS.get(
            'postmark_stats_outbound_overview', {}
        )

        # Create Header with Auth Token
        self._create_headers()

        for date_day in self._start_days_till_now(start_date_input):

            # Replace placeholder in reports path
            from_to_date: str = API_DATE_PATH.replace(
                ':date:',
                date_day,
            )

            self.logger.info(
                f'Recieving overview stats from {date_day}'
            )

            # Build URL
            url: str = (
                f'{API_SCHEME}{API_BASE_URL}{API_STATS_PATH}'
                f'{API_OUTBOUND_PATH}{from_to_date}'
            )

            # Make the call to Postmark API
            response: httpx._models.Response = self.client.get(  # noqa: WPS437
                url,
                headers=self.headers,
            )

            # Raise error on 4xx and 5xxx
            response.raise_for_status()

            # Create dictionary from response
            response_data: dict = response.json()

            # Yield Cleaned results
            yield cleaner(date_day, response_data)

    def stats_outbound_platform(  # noqa: WPS210, WPS432
        self,
        **kwargs: dict,
    ) -> Generator[dict, None, None]:  # noqa: DAR101
        """Get all platforms that opened mails from date.

        Raises:
            ValueError: When the parameter start_date is missing

        Yields:
            Generator[dict] --  Cleaned Bounce Data
        """
        # Validate the start_date value exists
        start_date_input: str = str(kwargs.get('start_date', ''))

        if not start_date_input:
            raise ValueError('The parameter start_date is required.')

        # Get the Cleaner
        cleaner: Callable = CLEANERS.get(
            'postmark_stats_outbound_platform', {}
        )

        # Create Header with Auth Token
        self._create_headers()

        for date_day in self._start_days_till_now(start_date_input):

            # Replace placeholder in reports path
            from_to_date: str = API_DATE_PATH.replace(
                ':date:',
                date_day,
            )

            self.logger.info(
                f'Recieving platform opens from {date_day}'
            )

            # Build URL
            url: str = (
                f'{API_SCHEME}{API_BASE_URL}{API_STATS_PATH}'
                f'{API_OUTBOUND_PATH}{API_OPENS_PATH}'
                f'{API_PLATFORM_PATH}{from_to_date}'
            )

            # Make the call to Postmark API
            response: httpx._models.Response = self.client.get(  # noqa: WPS437
                url,
                headers=self.headers,
            )

            # Raise error on 4xx and 5xxx
            response.raise_for_status()

            # Create dictionary from response
            response_data: dict = response.json()

            # Yield Cleaned results
            yield cleaner(date_day, response_data)

    def messages_outbound(self, **kwargs: dict) -> Generator[dict, None, None]:
        """Outbound messages.

        Raises:
            ValueError: When the parameter start_date is not in the kwargs
            ValueError: If the start_date is more than 45 days ago

        Yields:
            Generator[dict, None, None] -- Messages
        """
        start_date_input: str = str(kwargs.get('start_date', ''))

        # Check start date
        if not start_date_input:
            raise ValueError('The parameter start_date is required.')

        # Parse start date
        start_date: date = datetime.strptime(
            start_date_input,
            '%Y-%m-%d',
        ).date()
        if start_date < date.today() - MESSAGES_MAX_HISTORY:
            raise ValueError('The start_date must be at max 45 days ago.')

        # Get the Cleaner
        cleaner: Callable = CLEANERS.get(
            'postmark_messages_outbound',
            {},
        )

        # Create Header with Auth Token
        self._create_headers()

        # Build URL
        url: str = (
            f'{API_SCHEME}{API_BASE_URL}{API_MESSAGES_PATH}'
            f'{API_OUTBOUND_PATH}'
        )

        # Number of messages to fetch in a batch
        batch_size: int = 500

        # For every date between the start date and now
        for date_day in self._start_days_till_now(start_date_input):

            # Update http parameters
            http_parameters: dict = {
                'count': batch_size,
                'fromdate': date_day,
                'todate': date_day,
                'offset': 0,
            }

            # Paging helpers
            more = True
            total = 0

            # While there are more messages availbe
            while more:

                # Batch counter
                counter: int = (total // batch_size) + 1

                # Make the call to Postmark API
                response: httpx._models.Response = self.client.get(  # noqa
                    url,
                    headers=self.headers,
                    params=http_parameters,
                )

                # Raise error on 4xx and 5xxx
                response.raise_for_status()

                # Create dictionary from response
                response_data: dict = response.json()

                # Retrieve list of messages
                message_data: List[dict] = response_data.get('Messages', [])

                # Count the messages
                message_count: int = len(message_data)

                # If the batch is not full, then there are no more batches
                if message_count < batch_size:
                    more = False

                # Clean and yield the message
                # for each message, creating a new API and get message details
                for message in message_data:
                    API_MESSAGEID: str = '/'+ message['MessageID']
                    API_DETAILS = '/details'
                    url2: str = (
                        f'{API_SCHEME}{API_BASE_URL}{API_MESSAGES_PATH}'
                        f'{API_OUTBOUND_PATH}{API_MESSAGEID}{API_DETAILS}'
                    )
                    
                    details_response : httpx._models.Response = self.client.get(  # noqa
                        url2,
                        headers=self.headers,
                        params=http_parameters,
                    )
                    details_response.raise_for_status()

                    # Create dictionary from response
                    details_data: dict = details_response.json()

                    # Retrieve list of messages
                    details_messageEvents: List[dict] = details_data.get('MessageEvents', '')

                    # Extract messageEvent types frome the MessageEvent list
                    messageEvent_types: str = ''
                    for event in details_messageEvents:
                        messageEvent_types = messageEvent_types + event['Type']+',' 
                    messageEvent_types =  messageEvent_types[:-1] # Get rid of the last comma                     
                    message['MessageEvents'] = messageEvent_types

                    yield cleaner(date_day, message)
                    total += 1

                self.logger.info(
                    f'Date {date_day}, batch: {counter}, messages: {total}',
                )

                # Update the offset
                http_parameters['offset'] += batch_size

    def messages_opens(self, **kwargs: dict) -> Generator[dict, None, None]:
        """Opens messages.

        Raises:
            ValueError: When the parameter start_date is not in the kwargs
            ValueError: If the start_date is more than 45 days ago

        Yields:
            Generator[dict, None, None] -- Messages
        """
        start_date_input: str = str(kwargs.get('start_date', ''))

        # Check start date
        if not start_date_input:
            raise ValueError('The parameter start_date is required.')

        # Parse start date
        start_date: date = datetime.strptime(
            start_date_input,
            '%Y-%m-%d',
        ).date()
        if start_date < date.today() - MESSAGES_MAX_HISTORY:
            raise ValueError('The start_date must be at max 45 days ago.')

        # Get the Cleaner
        cleaner: Callable = CLEANERS.get(
            'postmark_messages_opens',
            {},
        )

        # Create Header with Auth Token
        self._create_headers()

        # Build URL
        url: str = (
            f'{API_SCHEME}{API_BASE_URL}{API_MESSAGES_PATH}'
            f'{API_OUTBOUND_PATH}{API_OPENS_PATH}'
        )

        # Number of messages to fetch in a batch
        batch_size: int = 500

        # For every date between the start date and now
        for date_day in self._start_days_till_now(start_date_input):

            # Update http parameters
            http_parameters: dict = {
                'count': batch_size,
                'fromdate': date_day,
                'todate': date_day,
                'offset': 0,
            }

            # Paging helpers
            more = True
            total = 0

            # While there are more messages availbe
            while more:

                # Batch counter
                counter: int = (total // batch_size) + 1

                # Make the call to Postmark API
                response: httpx._models.Response = self.client.get(  # noqa
                    url,
                    headers=self.headers,
                    params=http_parameters,
                )

                # Raise error on 4xx and 5xxx
                response.raise_for_status()

                # Create dictionary from response
                response_data: dict = response.json()

                # Retrieve list of messages
                message_data: List[dict] = response_data.get('Opens', [])

                # Count the messages
                message_count: int = len(message_data)

                # If the batch is not full, then there are no more batches
                if message_count < batch_size:
                    more = False

                # Clean and yield the message
                for message in message_data:
                    yield cleaner(date_day, message)
                    total += 1

                self.logger.info(
                    f'Date {date_day}, batch: {counter}, opens: {total}',
                )

                # Update the offset
                http_parameters['offset'] += batch_size

                # API has hard limit of 10000 ofset
                if http_parameters['offset'] >= 10000:  # noqa: WPS432
                    break

    def _start_days_till_now(self, start_date: str) -> Generator:
        """Yield YYYY/MM/DD for every day until now.

        Arguments:
            start_date {str} -- Start date e.g. 2020-01-01

        Yields:
            Generator -- Every day until now.
        """
        # Parse input date
        year: int = int(start_date.split('-')[0])
        month: int = int(start_date.split('-')[1].lstrip())
        day: int = int(start_date.split('-')[2].lstrip())

        # Setup start period
        period: date = date(year, month, day)

        # Setup itterator
        dates: rrule = rrule(
            freq=DAILY,
            dtstart=period,
            until=datetime.utcnow(),
        )

        # Yield dates in YYYY-MM-DD format
        yield from (date_day.strftime('%Y-%m-%d') for date_day in dates)

    def _create_headers(self) -> None:
        """Create authentication headers for requests."""
        headers: dict = dict(HEADERS)
        headers['X-Postmark-Server-Token'] = \
            headers['X-Postmark-Server-Token'].replace(
            ':token:',
            self.postmark_server_token,
        )
        self.headers = headers
