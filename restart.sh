#! /bin/bash

echo "Startup Stack redeploying..."

git pull

docker compose --env-file .env.local down          # stop Dockers
docker compose --env-file .env.local up --build -d # build and start Dockers

docker ps -a | grep startup-stack-docker-compose-single-vps

echo "Startup Stack deployed!"
