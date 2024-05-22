def worker(*args, **kwargs):
    # Example use of arguments inside the function
    print(f'Worker received: some_arg={args}, another_arg={kwargs}')
    # Simulate work with objects
    return [i for i in range(1000000)]


# Example function to track
def create_objects_example(count, *args, **kwargs):
    a = [1] * count
    b = 'A string' * count
    c = {'key': 'value' * count}
    return a, b, c
