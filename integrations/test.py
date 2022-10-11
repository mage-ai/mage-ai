from connections.amplitude import Amplitude
from datetime import datetime, timedelta
import importlib

# importlib.reload(integrations.connections.amplitude)



source = Amplitude('b3c3b09423fea2abaae92c08b44de1c3', 'a95f39a919dbf735d42ca24446a3d25c')
source.load(datetime.now() - timedelta(days=1))
