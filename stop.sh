#! /bin/bash

echo "Startup Stack stopping..."

git pull

docker compose down  # stop Dockers

docker ps -a

echo "Startup Stack stopped!"
