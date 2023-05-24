from mage_ai.tests.base_test import AsyncDBTestCase as TestCase
from mage_ai.api.middleware import parse_cookie_header


class UtilsTestCase(TestCase):
    def test_cookie_parser(self):
        named_cookies = "csrftoken=5lkzK7FCI2iWy2xi7wbZPI7P26qbspIE; django_language=en"

        self.assertEqual(
            parse_cookie_header(named_cookies),
            {
                "csrftoken": "5lkzK7FCI2iWy2xi7wbZPI7P26qbspIE",
                "django_language": "en",
            },
        )

        unnamed_cookies = (
            "csrftoken=5lkzK7FCI2iWy2xi7wbZPI7P26qbspIE; unnamed; django_language=en"
        )

        self.assertEqual(
            parse_cookie_header(unnamed_cookies),
            {
                "csrftoken": "5lkzK7FCI2iWy2xi7wbZPI7P26qbspIE",
                "django_language": "en",
                "": "unnamed",
            },
        )
