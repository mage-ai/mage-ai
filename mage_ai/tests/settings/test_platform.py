SETTINGS = dict(
    projects=dict(
        mage_platform=dict(
            database=dict(
                query=dict(
                    pipeline_schedules=[
                        'default_repo',
                        'default_repo/default_repo',
                    ],
                    secrets=[
                        'default_repo2',
                        'default_repo2/default_repo',
                    ],
                ),
            ),
        ),
    ),
)
