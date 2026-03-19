"""
Tests for sync_deletions_from_code: when save_in_code_automatically and
sync_deletions_from_code are both set, the scheduler removes from the DB any
pipeline schedule that is no longer in triggers.yaml. Also tests that we never
nuke triggers when save_in_code_automatically is off (disaster prevention).
"""
import os
from unittest.mock import patch

import yaml

from mage_ai.data_preparation.models.constants import PIPELINES_FOLDER
from mage_ai.data_preparation.models.triggers import (
    get_triggers_file_path,
    triggers_cache,
)
from mage_ai.orchestration.db import db_connection
from mage_ai.orchestration.db.models.schedules import PipelineSchedule
from mage_ai.orchestration.pipeline_scheduler_original import sync_schedules
from mage_ai.tests.base_test import DBTestCase
from mage_ai.tests.factory import create_pipeline_with_blocks

PIPELINE_CONFIG_FILE = 'metadata.yaml'


def _pipeline_dir(repo_path: str, pipeline_uuid: str) -> str:
    return os.path.join(repo_path, PIPELINES_FOLDER, pipeline_uuid)


def _write_pipeline_settings_triggers(
    repo_path: str,
    pipeline_uuid: str,
    save_in_code_automatically: bool = None,
    sync_deletions_from_code: bool = None,
) -> None:
    """Update pipeline metadata.yaml with settings.triggers."""
    path = os.path.join(_pipeline_dir(repo_path, pipeline_uuid), PIPELINE_CONFIG_FILE)
    with open(path, 'r') as f:
        config = yaml.safe_load(f) or {}
    config['settings'] = config.get('settings') or {}
    config['settings']['triggers'] = config['settings'].get('triggers') or {}
    if save_in_code_automatically is not None:
        config['settings']['triggers']['save_in_code_automatically'] = save_in_code_automatically
    if sync_deletions_from_code is not None:
        config['settings']['triggers']['sync_deletions_from_code'] = sync_deletions_from_code
    with open(path, 'w') as f:
        yaml.dump(config, f)


def _write_triggers_yaml(repo_path: str, pipeline_uuid: str, trigger_dicts: list) -> None:
    """Write triggers.yaml with the given trigger configs."""
    path = get_triggers_file_path(pipeline_uuid, repo_path=repo_path)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    content = yaml.safe_dump(dict(triggers=trigger_dicts))
    with open(path, 'w') as f:
        f.write(content)


class SyncDeletionsFromCodeTests(DBTestCase):
    """sync_schedules() deletion behavior when sync_deletions_from_code is enabled."""

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.pipeline, _ = create_pipeline_with_blocks(
            'sync_del_pipeline',
            cls.repo_path,
            return_blocks=True,
        )
        cls.pipeline_uuid = cls.pipeline.uuid

    def setUp(self):
        super().setUp()
        # Clear any schedules for our pipeline from previous tests
        PipelineSchedule.query.filter(
            PipelineSchedule.pipeline_uuid == self.pipeline_uuid,
        ).delete()
        db_connection.session.commit()
        # Clear triggers cache so tests see current YAML on disk
        trigger_path = get_triggers_file_path(self.pipeline_uuid, repo_path=self.repo_path)
        triggers_cache.pop(trigger_path, None)

    # ---- Happy path and flag off ----

    def test_sync_deletions_happy_path_trigger_removed_from_yaml_then_deleted_from_db(self):
        """With both flags on: remove trigger from YAML, sync_schedules() -> DB no longer has it."""
        _write_pipeline_settings_triggers(
            self.repo_path,
            self.pipeline_uuid,
            save_in_code_automatically=True,
            sync_deletions_from_code=True,
        )
        _write_triggers_yaml(self.repo_path, self.pipeline_uuid, [
            dict(
                name='keep_me',
                pipeline_uuid=self.pipeline_uuid,
                schedule_type='time',
                schedule_interval='@daily',
                start_time='2024-01-01 00:00:00',
                status='inactive',
            ),
            dict(
                name='remove_me',
                pipeline_uuid=self.pipeline_uuid,
                schedule_type='time',
                schedule_interval='@hourly',
                start_time='2024-01-01 00:00:00',
                status='inactive',
            ),
        ])
        PipelineSchedule.create(
            name='keep_me',
            pipeline_uuid=self.pipeline_uuid,
            repo_path=self.repo_path,
        )
        PipelineSchedule.create(
            name='remove_me',
            pipeline_uuid=self.pipeline_uuid,
            repo_path=self.repo_path,
        )
        db_connection.session.commit()

        # Remove 'remove_me' from YAML
        _write_triggers_yaml(self.repo_path, self.pipeline_uuid, [
            dict(
                name='keep_me',
                pipeline_uuid=self.pipeline_uuid,
                schedule_type='time',
                schedule_interval='@daily',
                start_time='2024-01-01 00:00:00',
                status='inactive',
            ),
        ])

        sync_schedules([self.pipeline_uuid])

        kept = PipelineSchedule.query.filter(
            PipelineSchedule.pipeline_uuid == self.pipeline_uuid,
            PipelineSchedule.name == 'keep_me',
        ).one_or_none()
        removed = PipelineSchedule.query.filter(
            PipelineSchedule.pipeline_uuid == self.pipeline_uuid,
            PipelineSchedule.name == 'remove_me',
        ).one_or_none()
        self.assertIsNotNone(kept, 'keep_me should still exist in DB')
        self.assertIsNone(removed, 'remove_me should be deleted from DB')

    def test_sync_deletions_flag_off_trigger_removed_from_yaml_still_in_db(self):
        """sync_deletions off: remove trigger from YAML, sync_schedules() -> still in DB."""
        _write_pipeline_settings_triggers(
            self.repo_path,
            self.pipeline_uuid,
            save_in_code_automatically=True,
            sync_deletions_from_code=False,
        )
        _write_triggers_yaml(self.repo_path, self.pipeline_uuid, [
            dict(
                name='only_in_db_after_yaml_edit',
                pipeline_uuid=self.pipeline_uuid,
                schedule_type='time',
                schedule_interval='@daily',
                start_time='2024-01-01 00:00:00',
                status='inactive',
            ),
        ])
        PipelineSchedule.create(
            name='only_in_db_after_yaml_edit',
            pipeline_uuid=self.pipeline_uuid,
            repo_path=self.repo_path,
        )
        db_connection.session.commit()

        # Remove from YAML (simulate user editing file)
        _write_triggers_yaml(self.repo_path, self.pipeline_uuid, [])

        sync_schedules([self.pipeline_uuid])

        still_there = PipelineSchedule.query.filter(
            PipelineSchedule.pipeline_uuid == self.pipeline_uuid,
            PipelineSchedule.name == 'only_in_db_after_yaml_edit',
        ).one_or_none()
        self.assertIsNotNone(
            still_there,
            'Schedule should still be in DB when sync_deletions_from_code is False',
        )

    def test_sync_deletions_save_in_code_off_no_deletions_even_when_sync_deletions_on(self):
        """sync_deletions on but save_in_code off -> no deletions (safe)."""
        _write_pipeline_settings_triggers(
            self.repo_path,
            self.pipeline_uuid,
            save_in_code_automatically=False,
            sync_deletions_from_code=True,
        )
        _write_triggers_yaml(self.repo_path, self.pipeline_uuid, [])
        PipelineSchedule.create(
            name='would_be_nuked',
            pipeline_uuid=self.pipeline_uuid,
            repo_path=self.repo_path,
        )
        db_connection.session.commit()

        sync_schedules([self.pipeline_uuid])

        still_there = PipelineSchedule.query.filter(
            PipelineSchedule.pipeline_uuid == self.pipeline_uuid,
            PipelineSchedule.name == 'would_be_nuked',
        ).one_or_none()
        self.assertIsNotNone(
            still_there,
            'Must not delete when save_in_code_automatically is False (disaster prevention)',
        )

    # ---- envs filter ----

    @patch('mage_ai.orchestration.pipeline_scheduler_original.get_env')
    def test_sync_deletions_envs_other_env_schedule_deleted_on_this_env(self, mock_get_env):
        """Trigger has envs: [prod]; current env is dev -> schedule deleted on dev."""
        mock_get_env.return_value = 'dev'
        _write_pipeline_settings_triggers(
            self.repo_path,
            self.pipeline_uuid,
            save_in_code_automatically=True,
            sync_deletions_from_code=True,
        )
        _write_triggers_yaml(self.repo_path, self.pipeline_uuid, [
            dict(
                name='prod_only',
                pipeline_uuid=self.pipeline_uuid,
                schedule_type='time',
                schedule_interval='@daily',
                start_time='2024-01-01 00:00:00',
                status='inactive',
                envs=['prod'],
            ),
        ])
        PipelineSchedule.create(
            name='prod_only',
            pipeline_uuid=self.pipeline_uuid,
            repo_path=self.repo_path,
        )
        db_connection.session.commit()

        sync_schedules([self.pipeline_uuid])

        gone = PipelineSchedule.query.filter(
            PipelineSchedule.pipeline_uuid == self.pipeline_uuid,
            PipelineSchedule.name == 'prod_only',
        ).one_or_none()
        self.assertIsNone(
            gone,
            'Schedule with envs [prod] should be deleted on dev when not in yaml_trigger_names',
        )

    @patch('mage_ai.orchestration.pipeline_scheduler_original.get_env')
    def test_sync_deletions_envs_this_env_schedule_kept(self, mock_get_env):
        """Trigger has envs: [dev]; current env is dev -> schedule kept."""
        mock_get_env.return_value = 'dev'
        _write_pipeline_settings_triggers(
            self.repo_path,
            self.pipeline_uuid,
            save_in_code_automatically=True,
            sync_deletions_from_code=True,
        )
        _write_triggers_yaml(self.repo_path, self.pipeline_uuid, [
            dict(
                name='dev_trigger',
                pipeline_uuid=self.pipeline_uuid,
                schedule_type='time',
                schedule_interval='@daily',
                start_time='2024-01-01 00:00:00',
                status='inactive',
                envs=['dev'],
            ),
        ])
        PipelineSchedule.create(
            name='dev_trigger',
            pipeline_uuid=self.pipeline_uuid,
            repo_path=self.repo_path,
        )
        db_connection.session.commit()

        sync_schedules([self.pipeline_uuid])

        kept = PipelineSchedule.query.filter(
            PipelineSchedule.pipeline_uuid == self.pipeline_uuid,
            PipelineSchedule.name == 'dev_trigger',
        ).one_or_none()
        self.assertIsNotNone(kept, 'Schedule with envs [dev] should be kept on dev')

    # ---- File missing / empty ----

    def test_sync_deletions_triggers_yaml_deleted_all_schedules_gone(self):
        """With both flags on: delete triggers.yaml -> sync -> all schedules for pipeline gone."""
        _write_pipeline_settings_triggers(
            self.repo_path,
            self.pipeline_uuid,
            save_in_code_automatically=True,
            sync_deletions_from_code=True,
        )
        _write_triggers_yaml(self.repo_path, self.pipeline_uuid, [
            dict(
                name='gone',
                pipeline_uuid=self.pipeline_uuid,
                schedule_type='time',
                schedule_interval='@daily',
                start_time='2024-01-01 00:00:00',
                status='inactive',
            ),
        ])
        PipelineSchedule.create(
            name='gone',
            pipeline_uuid=self.pipeline_uuid,
            repo_path=self.repo_path,
        )
        db_connection.session.commit()

        # Remove triggers.yaml
        path = get_triggers_file_path(self.pipeline_uuid, repo_path=self.repo_path)
        if os.path.exists(path):
            os.remove(path)
        triggers_cache.pop(path, None)

        sync_schedules([self.pipeline_uuid])

        count = PipelineSchedule.query.filter(
            PipelineSchedule.pipeline_uuid == self.pipeline_uuid,
        ).count()
        self.assertEqual(count, 0, 'All schedules for pipeline should be deleted when file is gone')

    def test_sync_deletions_empty_triggers_array_all_schedules_gone(self):
        """With both flags on: triggers: [] -> sync -> all schedules for pipeline gone."""
        _write_pipeline_settings_triggers(
            self.repo_path,
            self.pipeline_uuid,
            save_in_code_automatically=True,
            sync_deletions_from_code=True,
        )
        _write_triggers_yaml(self.repo_path, self.pipeline_uuid, [])
        PipelineSchedule.create(
            name='nuked',
            pipeline_uuid=self.pipeline_uuid,
            repo_path=self.repo_path,
        )
        db_connection.session.commit()

        sync_schedules([self.pipeline_uuid])

        nuked = PipelineSchedule.query.filter(
            PipelineSchedule.pipeline_uuid == self.pipeline_uuid,
            PipelineSchedule.name == 'nuked',
        ).one_or_none()
        self.assertIsNone(nuked, 'Schedule should be deleted when triggers array is empty')

    # ---- UI-only trigger ----

    def test_sync_deletions_trigger_only_in_db_deleted_when_flags_on(self):
        """Trigger in DB but not in YAML (e.g. UI-created); sync with both flags -> deleted."""
        _write_pipeline_settings_triggers(
            self.repo_path,
            self.pipeline_uuid,
            save_in_code_automatically=True,
            sync_deletions_from_code=True,
        )
        _write_triggers_yaml(self.repo_path, self.pipeline_uuid, [])
        PipelineSchedule.create(
            name='ui_only_trigger',
            pipeline_uuid=self.pipeline_uuid,
            repo_path=self.repo_path,
        )
        db_connection.session.commit()

        sync_schedules([self.pipeline_uuid])

        gone = PipelineSchedule.query.filter(
            PipelineSchedule.pipeline_uuid == self.pipeline_uuid,
            PipelineSchedule.name == 'ui_only_trigger',
        ).one_or_none()
        self.assertIsNone(gone, 'UI-only trigger should be deleted when YAML is authoritative')

    # ---- Idempotency ----

    def test_sync_deletions_idempotent_second_sync_no_errors(self):
        """Sync twice with same YAML -> no extra deletes, no errors."""
        _write_pipeline_settings_triggers(
            self.repo_path,
            self.pipeline_uuid,
            save_in_code_automatically=True,
            sync_deletions_from_code=True,
        )
        _write_triggers_yaml(self.repo_path, self.pipeline_uuid, [
            dict(
                name='idem',
                pipeline_uuid=self.pipeline_uuid,
                schedule_type='time',
                schedule_interval='@daily',
                start_time='2024-01-01 00:00:00',
                status='inactive',
            ),
        ])
        PipelineSchedule.create(
            name='idem',
            pipeline_uuid=self.pipeline_uuid,
            repo_path=self.repo_path,
        )
        db_connection.session.commit()

        sync_schedules([self.pipeline_uuid])
        count_after_first = PipelineSchedule.query.filter(
            PipelineSchedule.pipeline_uuid == self.pipeline_uuid,
        ).count()
        sync_schedules([self.pipeline_uuid])
        count_after_second = PipelineSchedule.query.filter(
            PipelineSchedule.pipeline_uuid == self.pipeline_uuid,
        ).count()

        self.assertEqual(count_after_first, 1)
        self.assertEqual(count_after_second, 1, 'Second sync should not change DB')
