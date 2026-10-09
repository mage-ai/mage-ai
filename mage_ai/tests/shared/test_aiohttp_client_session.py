import ast
import unittest
from pathlib import Path


class AiohttpClientSessionTest(unittest.TestCase):
    def test_client_sessions_trust_environment_proxy_settings(self):
        package_root = Path(__file__).resolve().parents[2]
        tests_root = package_root / 'tests'
        missing_trust_env = []
        session_call_count = 0

        for path in sorted(package_root.rglob('*.py')):
            if tests_root in path.parents:
                continue

            source = path.read_text()
            if 'aiohttp.ClientSession' not in source:
                continue

            tree = ast.parse(source)
            for node in ast.walk(tree):
                if not self.__is_aiohttp_client_session_call(node):
                    continue

                session_call_count += 1
                trust_env_keyword = next(
                    (
                        keyword
                        for keyword in node.keywords
                        if keyword.arg == 'trust_env'
                    ),
                    None,
                )

                if not self.__is_true_constant(trust_env_keyword):
                    missing_trust_env.append(
                        f'{path.relative_to(package_root.parent)}:{node.lineno}'
                    )

        self.assertGreater(session_call_count, 0)
        self.assertEqual(
            [],
            missing_trust_env,
            'aiohttp.ClientSession must use trust_env=True so HTTP_PROXY, '
            'HTTPS_PROXY, and NO_PROXY environment settings are honored.',
        )

    def __is_aiohttp_client_session_call(self, node):
        return (
            isinstance(node, ast.Call)
            and isinstance(node.func, ast.Attribute)
            and node.func.attr == 'ClientSession'
            and isinstance(node.func.value, ast.Name)
            and node.func.value.id == 'aiohttp'
        )

    def __is_true_constant(self, keyword):
        return (
            keyword is not None
            and isinstance(keyword.value, ast.Constant)
            and keyword.value.value is True
        )
