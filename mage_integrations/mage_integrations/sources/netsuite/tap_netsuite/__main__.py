import tap_netsuite
import time

start_time = time.time()
tap_netsuite.main()
print("--- %s seconds ---" % (time.time() - start_time))
