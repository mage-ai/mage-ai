# Custom Spark Docker Image for MageAI
With this, we can manage our own Spark cluster without the need for Bitnami/Spark

## Docker Build
```bash
  docker build -t <docker_name/docker_repo>:<tag> .
```

## Docker Run
```bash
  docker run --rm -it <docker_name/docker_repo>:<tag> bash
```

## Docker Push
```bash
  docker push <docker_name/docker_repo>:<tag> 
  ```

## Helm Install
```bash
  helm upgrade --install <spark-name> <docker_name/docker_repo> -f spark.yaml
```

## Acknowledgements
Special thanks to [Malaysia.AI](https://github.com/malaysia-ai) for assisting in creating this dockerfile to serve a custom Spark cluster along with its dependencies. 

With this, we are able to self-manage and host MageAI with our very own Spark cluster.
