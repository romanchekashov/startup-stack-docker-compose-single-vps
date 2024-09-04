#! /bin/bash

echo "Startup Stack redeploying..."

git pull

docker-compose down          # stop Dockers
docker-compose up --build -d # build and start Dockers

docker ps -a

echo "Startup Stack deployed!"
