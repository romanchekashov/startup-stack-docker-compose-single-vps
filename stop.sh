#! /bin/bash

echo "Startup Stack stopping..."

git pull

docker compose --env-file .env.local down          # stop Dockers

docker ps -a

echo "Startup Stack stopped!"
