from setuptools import setup

setup(
    name='app',
    packages=['server'],
    include_package_data=True,
    install_requires=[
        'flask',
    ],
)
