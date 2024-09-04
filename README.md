Startup Stack with Docker Compose on Single VPS
=================
For quick start-up of your project on a single VPS with Docker Compose.
- Nginx with Let's Encrypt SSL certificates and automatic renewal. Enabled in docker-compose.yml by default.
- Other services: Node.js, React, Express, MongoDB, PostgreSQL, Redis, etc. are commented out in docker-compose.yml.
- Uncomment services you need and configure them in .env.local file.
- Run `docker-compose --env-file .env.local up --build -d` to build and start up your project.
- Run `docker-compose --env-file .env.local down` to stop your project.
