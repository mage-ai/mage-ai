# MongoDB Atlas Spike
Atlas is MongoDB's cloud service that can be hosted on aws. We already have an Atlas account that can be accessed by:
1. Go to https://cloud.mongodb.com
2. Creds in 1pass

### Cluster Tiers
| Tier | RAM | Storage | vCPU | Price/month |
| ---- | --- | ------- | ---- | ---------- |
| M0 | Shared | 512 MB | Shared | Free |
| M2 | Shared | 2 GB | Shared | $9 |
| M5 | Shared | 5 GB | Shared | $25 |
| M10 | 2 GB | 10 GB | 1 vCPU | ~$58 |
| M20 | 4 GB | 20 GB | 2 vCPU | ~$144 | 
  
M0, M2 shared, and M5 shared tiers have limitations
- Each account can only have one M0 cluster
- Can only use Mongo version 4.0
- Cannot configure memory or storage size

### Possible Setups
- Have one cluster with a separate db for dev/circle
  - Atlas allows, at a minimum, up to 100 connections
- Have one cluster for dev, one for circle
- Use projects -- Atlas projects are meant for separate, isolated environments

Suggest having a separate project for dev & circle
  - each having a single cluster
  - https://docs.atlas.mongodb.com/tutorial/manage-projects/
  - can add more if we start running into collisions (dev, circle, dev-tap-tester, harrison-tap-tester, etc)

### Connecting to Atlas
- Download mongo community edition
  - [Installation Instructions](https://docs.mongodb.com/manual/tutorial/install-mongodb-on-ubuntu/)
  - Installs mongo shell and a number of other modules

#### Using Mongo Shell
To connect to our M0 free tier cluster (username/password in 1Pass):
```
mongo mongodb+srv://stitch-upwjw.mongodb.net/test -u <username> -p <password>
```

## Other Options Considered
- Set up local mongo server 
  - Seems like a lot more overhead, especially when using circle
- Set up Mongo Stack on AWS (spins up EC2 instance with Mongo)
  - Much more expensive (~$12,000/year!)
 
