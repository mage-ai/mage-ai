from mage_integrations.utils.parsers import process_data
test_data_bytes = b"\x01\x15(\xce\xca`|\xa3\xa7\xad#c$\x8c\x01\xe9J\xaa\x0f\xb7\xd4\xd0T\x02G\xf2\xa41\x95 a\xfd\xd8\xc7\xe7F\xc5\xdb\x9c\x8f\xa6i\x02\x8c\x8e\xd4\x00\xa4\x82\xa7;A\xf6\x14R2\x81\x91\xd6\x8a\x00L\xae\x07\xc9\xfa\xd2\x1cn\xe0b\x8a(\x18\x94f\x8a(\x00\xcd\x14Q@\x1f"

test_data_dict = {
    "key1": "value1",
    "key2": test_data_bytes
}

test_data_list = [
    "string",
    test_data_bytes
]



class MockMessage:
    def __init__(self, data):
        self.data = data

    def asdict(self):
        return self.data


# Tests for process_data
def test_process_data_dict():
    result = process_data(test_data_dict)
    assert isinstance(result, dict)
    assert isinstance(result["key1"], str)
    assert isinstance(result["key2"], str)


def test_process_data_list():
    result = process_data(test_data_list)
    assert isinstance(result, list)
    assert isinstance(result[0], str)
    assert isinstance(result[1], str)


def test_process_data_bytes():
    result = process_data(test_data_bytes)
    assert isinstance(result, str)

