Startup Stack with Docker Compose on Single VPS
=================
For quick start-up of your project on a single VPS with Docker Compose.

## How to use
- Nginx with Let's Encrypt SSL certificates and automatic renewal. Enabled in `docker-compose.yml` by default.
- Other services: PostgreSQL, Redis, MongoDB, etc. are commented out in `docker-compose.yml`.
- Uncomment services you need in [docker-compose.yml](./docker-compose.yml) and configure them in `.env.local` file which can be created from [.env.example](./.env.example).
### Execute commands:
```shell
docker compose --env-file .env.local up --build -d # to build and start up your project
docker compose --env-file .env.local down          # to stop your project
```
---

## Tech Stack
- Nginx - Reverse Proxy with Let's Encrypt SSL certificates
- Buckup - Backup files(db backups) to Firebase Storage
### Should be uncommented in `docker-compose.yml`:
- PostgreSQL - Main database
- Redis - Cache
- MongoDB - NoSQL Document database

> Note: You can add more services to [docker-compose.yml](./docker-compose.yml) and configure them in `.env.local` file.

#### Nginx
```sh
docker compose -f docker-compose.nginx.yml up -d  # Start Nginx
docker compose -f docker-compose.nginx.yml down   # to stop your project
```

#### MinIO
- MinIO - Object Storage
- Uncomment services you need in [docker-compose.minio.yml](./docker-compose.minio.yml) and configure them in `.env.local` file which can be created from [.env.example](./.env.example).
```sh
docker compose -f docker-compose.minio.yml --env-file .env.local up -d  # Start MinIO
docker compose -f docker-compose.minio.yml --env-file .env.local down   # to stop your project
```
