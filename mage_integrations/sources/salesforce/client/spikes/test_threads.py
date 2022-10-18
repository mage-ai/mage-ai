#!/usr/bin/env python3

import sys
import threading
from time import sleep
from datetime import datetime

TIMER_LENGTH = 1

def login():
    print(f"In login, time is {datetime.now()}, threads is {threading.active_count()}")
    main_thread = threading.main_thread()
    main_is_alive = main_thread.is_alive()
    print(f"In login, main thread is alive? {main_is_alive}")

    # if not main_is_alive:
    #     print(f"In login, the main thread died, so time to go")
    #     sys.exit(0)

    myTimer = threading.Timer(TIMER_LENGTH, login )
    myTimer.daemon = True
    myTimer.start()

def main():
    print("In Main")
    login()
    sleep(5)
    sys.exit(0)




main()
