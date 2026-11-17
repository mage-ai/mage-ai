import asyncio
import inspect
import unittest


def _simulate_execute_block_function(block_function, input_vars, global_vars=None):
    sig = inspect.signature(block_function)
    has_kwargs = any(p.kind == p.VAR_KEYWORD for p in sig.parameters.values())

    is_async = inspect.iscoroutinefunction(block_function)
    is_async_gen = inspect.isasyncgenfunction(block_function)

    async def _run():
        if is_async or is_async_gen:
            if has_kwargs and global_vars is not None and len(global_vars) != 0:
                return await block_function(*input_vars, **global_vars)
            else:
                return await block_function(*input_vars)
        else:
            if has_kwargs and global_vars is not None and len(global_vars) != 0:
                return block_function(*input_vars, **global_vars)
            else:
                return block_function(*input_vars)

    return asyncio.run(_run())


async def _simulate_execute_block_function_async(
    block_function, input_vars, global_vars=None
):
    sig = inspect.signature(block_function)
    has_kwargs = any(p.kind == p.VAR_KEYWORD for p in sig.parameters.values())

    is_async = inspect.iscoroutinefunction(block_function)
    is_async_gen = inspect.isasyncgenfunction(block_function)

    if is_async or is_async_gen:
        if has_kwargs and global_vars is not None and len(global_vars) != 0:
            return await block_function(*input_vars, **global_vars)
        else:
            return await block_function(*input_vars)
    else:
        if has_kwargs and global_vars is not None and len(global_vars) != 0:
            return block_function(*input_vars, **global_vars)
        else:
            return block_function(*input_vars)


class TestAsyncDetection(unittest.TestCase):
    def test_iscoroutinefunction_async_def(self):
        async def my_func():
            pass
        self.assertTrue(inspect.iscoroutinefunction(my_func))

    def test_iscoroutinefunction_sync_def(self):
        def my_func():
            pass
        self.assertFalse(inspect.iscoroutinefunction(my_func))

    def test_isasyncgenfunction(self):
        async def my_gen():
            yield 1
        self.assertTrue(inspect.isasyncgenfunction(my_gen))
        self.assertFalse(inspect.iscoroutinefunction(my_gen))

    def test_isgeneratorfunction(self):
        def my_gen():
            yield 1
        self.assertTrue(inspect.isgeneratorfunction(my_gen))
        self.assertFalse(inspect.isasyncgenfunction(my_gen))


class TestSimulatedExecuteBlockFunction(unittest.TestCase):
    def test_sync_function_executes_normally(self):
        def transform(df):
            return df * 2

        result = _simulate_execute_block_function(transform, [5])
        self.assertEqual(result, 10)

    def test_async_function_is_awaited(self):
        async def transform(df):
            await asyncio.sleep(0)  # simulates an I/O yield
            return df * 3

        result = _simulate_execute_block_function(transform, [4])
        self.assertEqual(result, 12)

    def test_async_function_with_await_chain(self):
        async def fetch_data(x):
            await asyncio.sleep(0)
            return x + 100

        async def transform(df):
            value = await fetch_data(df)
            return value * 2

        result = _simulate_execute_block_function(transform, [5])
        self.assertEqual(result, 210)  # (5 + 100) * 2

    def test_sync_function_with_kwargs(self):
        def transform(df, **kwargs):
            return df * kwargs.get('factor', 1)

        result = _simulate_execute_block_function(
            transform, [3], global_vars={'factor': 7}
        )
        self.assertEqual(result, 21)

    def test_async_function_with_kwargs(self):
        async def transform(df, **kwargs):
            await asyncio.sleep(0)
            return df * kwargs.get('factor', 1)

        result = _simulate_execute_block_function(
            transform, [3], global_vars={'factor': 7}
        )
        self.assertEqual(result, 21)

    def test_async_function_no_args(self):
        async def load():
            await asyncio.sleep(0)
            return [1, 2, 3]

        result = _simulate_execute_block_function(load, [])
        self.assertEqual(result, [1, 2, 3])

    def test_async_function_exception_propagates(self):
        async def transform(df):
            await asyncio.sleep(0)
            raise ValueError('async error from block')

        with self.assertRaises(ValueError) as ctx:
            _simulate_execute_block_function(transform, [1])
        self.assertIn('async error from block', str(ctx.exception))

    def test_sync_function_exception_propagates(self):
        def transform(df):
            raise RuntimeError('sync error from block')

        with self.assertRaises(RuntimeError):
            _simulate_execute_block_function(transform, [1])

    def test_async_function_returns_none_gives_empty(self):
        async def transform(df):
            await asyncio.sleep(0)
            # implicitly returns None

        result = _simulate_execute_block_function(transform, [1])
        self.assertIsNone(result)

    def test_async_function_multiple_input_vars(self):
        async def transform(df1, df2):
            await asyncio.sleep(0)
            return df1 + df2

        result = _simulate_execute_block_function(transform, [10, 20])
        self.assertEqual(result, 30)


class TestAsyncGeneratorDetectionLogic(unittest.TestCase):
    def test_async_generator_detected(self):
        async def streaming_transform(df):
            for i in range(3):
                yield i

        fn = streaming_transform
        self.assertFalse(inspect.iscoroutinefunction(fn))
        self.assertTrue(inspect.isasyncgenfunction(fn))

    def test_async_generator_iteration(self):
        async def streaming_transform(df):
            for i in range(3):
                await asyncio.sleep(0)
                yield i * df

        async def collect():
            results = []
            async for item in streaming_transform(2):
                results.append(item)
            return results

        results = asyncio.run(collect())
        self.assertEqual(results, [0, 2, 4])

    def test_iter_output_helper_with_sync_generator(self):
        def sync_gen():
            yield 10
            yield 20

        async def collect_via_iter_output(gen, is_async_gen=False):
            async def _iter_output(g, _is_async_gen=is_async_gen):
                if _is_async_gen:
                    async for item in g:
                        yield item
                else:
                    for item in g:
                        yield item

            results = []
            async for item in _iter_output(gen):
                results.append(item)
            return results

        results = asyncio.run(collect_via_iter_output(sync_gen()))
        self.assertEqual(results, [10, 20])

    def test_iter_output_helper_with_async_generator(self):
        async def async_gen():
            yield 10
            yield 20

        async def collect_via_iter_output(gen, is_async_gen=True):
            async def _iter_output(g, _is_async_gen=is_async_gen):
                if _is_async_gen:
                    async for item in g:
                        yield item
                else:
                    for item in g:
                        yield item

            results = []
            async for item in _iter_output(gen):
                results.append(item)
            return results

        results = asyncio.run(collect_via_iter_output(async_gen()))
        self.assertEqual(results, [10, 20])


class TestExecuteSyncBridging(unittest.TestCase):
    def test_asyncio_run_works_without_running_loop(self):
        async def coro():
            return 42

        result = asyncio.run(coro())
        self.assertEqual(result, 42)

    def test_bridge_from_running_loop_via_thread(self):
        import concurrent.futures
        import threading

        async def my_block():
            await asyncio.sleep(0)
            return 99

        def run_via_bridge(coro_factory):
            future = concurrent.futures.Future()

            def _in_thread():
                try:
                    result = asyncio.run(coro_factory())
                    future.set_result(result)
                except Exception as exc:
                    future.set_exception(exc)

            t = threading.Thread(target=_in_thread, daemon=True)
            t.start()
            t.join()
            return future.result()

        result = run_via_bridge(my_block)
        self.assertEqual(result, 99)

    def test_get_running_loop_inside_async(self):
        with self.assertRaises(RuntimeError):
            asyncio.get_running_loop()


if __name__ == '__main__':
    unittest.main(verbosity=2)
