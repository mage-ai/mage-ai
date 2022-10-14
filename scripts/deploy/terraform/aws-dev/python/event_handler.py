import json
import os
import urllib.request


def lambda_handler(event, context):
    print(event)

    mage_api_host = os.getenv('MAGE_API_HOST')
    url = f'http://{mage_api_host}/api/events'

    request = urllib.request.Request(url)
    request.add_header('Content-Type', 'application/json; charset=utf-8')
    jsondata = json.dumps(event)
    jsondataasbytes = jsondata.encode('utf-8')
    request.add_header('Content-Length', len(jsondataasbytes))

    response = urllib.request.urlopen(request, jsondataasbytes, timeout=60 * 5)

    results = response.read().decode()
    print('results', results)

    return dict(
        body=json.loads(results),
        statusCode=200,
    )
