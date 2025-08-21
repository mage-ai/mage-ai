cd mage_ai/frontend
npm install
npm run build

docker build -t claritas-mage:v0.1.7 --platform=linux/amd64 -f Dockerfile.claritas . --load

docker tag claritas-mage:v0.1.7 asia-southeast1-docker.pkg.dev/claritas-bigdata-poc/claritas-mage/claritas-mage:v0.1.7

docker push asia-southeast1-docker.pkg.dev/claritas-bigdata-poc/claritas-mage/claritas-mage:v0.1.7

