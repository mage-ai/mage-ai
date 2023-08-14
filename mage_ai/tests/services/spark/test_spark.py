from mage_ai.services.spark.spark import get_file_names
from mage_ai.tests.base_test import TestCase


class SparkTests(TestCase):
    def test_get_file_names(self):
        self.assertEqual(
            get_file_names(['/home/spark-jars/aws-java-sdk-core-1.11.1026.jar']),
            ['aws-java-sdk-core-1.11.1026.jar']
        )
        self.assertEqual(
            get_file_names(['spark://************:2222/jars/aws-java-sdk-core-1.11.1026.jar']),
            ['aws-java-sdk-core-1.11.1026.jar']
        )
        self.assertEqual(
            get_file_names(['/home/spark-jars/test1.jar', '/home/spark-jars/test2.jar']),
            ['test1.jar', 'test2.jar']
        )
        self.assertEqual(
            get_file_names(['spark://************:2222/jars/test1.jar', 'spark://************:2222/jars/test2.jar']),
            ['test1.jar', 'test2.jar']
        )
