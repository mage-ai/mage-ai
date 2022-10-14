def parse_response(request, response):
    dimensions = [i.name for i in request.dimensions]
    metrics = [i.name for i in request.metrics]

    arr = []
    for row in response.rows:
        data = dict()
        for idx, dimension in enumerate(dimensions):
            data[dimension] = row.dimension_values[idx].value
        for idx, metric in enumerate(metrics):
            data[metric] = row.metric_values[idx].value
        arr.append(data)

    return arr
