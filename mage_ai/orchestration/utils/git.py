from typing import Dict

from mage_ai.data_preparation.logging.logger import DictLogger
from mage_ai.data_preparation.preferences import get_preferences
from mage_ai.data_preparation.sync import GitConfig
from mage_ai.data_preparation.sync.git_sync import GitSync
from mage_ai.orchestration.utils.distributed_lock import DistributedLock


def run_git_sync(
    lock: DistributedLock = None,
    sync_config: GitConfig = None,
    setup_repo: bool = False,
) -> Dict:
    if sync_config is None:
        preferences = get_preferences()
        if preferences.sync_config:
            sync_config = GitConfig.load(config=preferences.sync_config)

    result = dict()
    git_sync_lock_key = 'git_sync'
    if not lock or lock.try_acquire_lock(git_sync_lock_key):
        try:
            GitSync(sync_config, setup_repo=setup_repo).sync_data()
            result = dict(
                status='success',
                remote_repo_link=sync_config.remote_repo_link,
                branch=sync_config.branch,
            )
        except Exception as err:
            result = dict(
                status='failed',
                error=str(err),
                remote_repo_link=sync_config.remote_repo_link,
                branch=sync_config.branch,
            )
        if lock:
            lock.release_lock(git_sync_lock_key)

    return result


def log_git_sync(result: Dict, logger: DictLogger, tags: Dict = None) -> None:
    if result is None:
        return

    if tags is None:
        tags = dict()
    git_sync_status = result.get('status')
    if git_sync_status == 'success':
        logger.info(
            'Successfully synced data from git repo: '
            f'{result.get("remote_repo_link")}, branch: {result.get("branch")}',
            **tags,
        )
    elif git_sync_status == 'failed':
        logger.warning(
            f'Failed to sync data from git repo: {result.get("remote_repo_link")}'
            f', branch: {result.get("branch")} with error: ' + str(result.get("error")),
            **tags,
        )
