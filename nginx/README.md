Nginx with docker-compose
=================
Nginx is an open source HTTP server and reverse proxy server. It is an essential part of the LEMP stack, which consists of Linux, Nginx, MySQL, and PHP. Nginx is known for its high performance, stability, rich feature set, simple configuration, and low resource consumption.
> Note: There is an alternative project which you can use if you want: [docker-nginx-certbot by JonasAlfredsson](https://github.com/JonasAlfredsson/docker-nginx-certbot)

## How to create Let's Encrypt SSL certificates look: [LETSENCRYPT.md](./LETSENCRYPT.md)

---

## How to use Nginx with Docker Compose:
1. Copy Nginx config example from [/examples-nginx-configs](./examples-nginx-configs) to [/sites-available](./sites-available) directory and edit it as needed.
2. After any change in Nginx configs just restart Nginx (docker compose) with script below:
```shell
./restart.sh
# or
docker-compose down          # stop Dockers
docker-compose up --build -d # build and start Dockers
```
### Examples of Nginx configs for your site:
- [Backend service](./examples-nginx-configs/example.conf)
- [Backend service (HTTPS)](./examples-nginx-configs/example_ssl.conf)
- [React SPA (HTTPS)](./examples-nginx-configs/react_spa_ssl.conf)

#### By default, Nginx `root /usr/share/nginx/html;` points to [/public](./public) directory through [docker-compose.yml](./docker-compose.yml) volumes:
```shell
# docker-compose.yml
volumes:
  - ./public:/usr/share/nginx/html
```
> Any change in [/public](./public) will be visible outside immediately while Nginx-docker is running!
---

## How to edit Nginx config example:
### Create or copy example of Nginx config for your site with SSL certificates in [/sites-available](./sites-available) directory:

#### If you using Let's Encrypt SSL certificate:
- Update `example.com` with your domain name.
```shell
# sites-available/example_ssl.conf
server {
  listen 80;
  server_name example.com;
  return 301 https://example.com$request_uri;
}

server {
  listen  443 ssl;
  http2   on;
  # If you have Let's Encrypt SSL you just need to update the domain name in 2 lines below
  ssl_certificate        /etc/letsencrypt/live/example.com/fullchain.pem;
  ssl_certificate_key    /etc/letsencrypt/live/example.com/privkey.pem;

  server_name example.com;

  location / {
    # Use your VPS IP address and port number, example: http://192.168.22.10:3000   
    proxy_pass http://<YOUR VPS IP address>:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
  }
}
```

#### If you have SSL certificates files `fullchain.pem` and `privkey.pem`:
1. Add volume to `docker-compose.yml` with path to directory with your SSL certificates files.
```shell
# docker-compose.yml
volumes:
  - /home/my_ssl_certificates_on_your_computer:/home/ssl_certificates_on_docker
```
2. Update Nginx config for your site with SSL certificates:
```shell
# sites-available/example_ssl.conf
# ... (copy from above example_ssl.conf)
server {
  listen  443 ssl;
  http2   on;
  ssl_certificate        /home/ssl_certificates_on_docker/fullchain.pem;
  ssl_certificate_key    /home/ssl_certificates_on_docker/privkey.pem;
  
  # ... (continue copy from above example_ssl.conf)
}
```

### Enable gzip for JS / CSS / JSON
`nginx.conf` has `gzip on;`, but nginx's default `gzip_types` is **`text/html` only** — JS bundles, CSS and JSON API
responses are sent uncompressed. On a slow link this is very visible: a 1.4 MB React bundle took ~26 s to load,
with gzip it is ~400 KB and ~1 s. Add to the `server { listen 443 ... }` block of your site:
```shell
# sites-available/example_ssl.conf
server {
  # ...
  gzip            on;
  gzip_comp_level 5;
  gzip_min_length 1024;
  gzip_proxied    any;   # also compress responses proxied from your backend
  gzip_vary       on;
  gzip_types      text/css text/plain text/javascript application/javascript application/json image/svg+xml;
  # ...
}
```
If the backend uses **SockJS** (e.g. Spring STOMP on `/ws`), turn gzip off for that path: SockJS fallback transports
stream data as `application/javascript`, and gzip would buffer the stream. See
[example_ssl.conf](./examples-nginx-configs/example_ssl.conf).

Check:
```shell
curl -s -o /dev/null -H "Accept-Encoding: gzip" -w "%{size_download} bytes, %header{content-encoding}\n" https://example.com/assets/index.js
```

Apply without downtime (site configs in `/sites-available` are mounted into the container):
```shell
docker exec nginx nginx -t && docker exec nginx nginx -s reload
```

### Cache hashed build assets (`/assets/`)
Vite (`/assets/index-AbC123.js`) and CRA (`/static/`) put a content hash into every asset file name, so a file never
changes under the same name and can be cached by the browser for a year. `index.html` must stay **uncached** — it
references the new file names after each deploy. Many backends send `Cache-Control: no-store` on every response
(e.g. Spring Security), which makes the browser re-download the whole bundle on every page open.

Backend behind a proxy — replace the backend's headers for `/assets/` only:
```shell
# sites-available/example_ssl.conf
location /assets/ {
  proxy_pass http://<YOUR VPS IP address>:3000;
  proxy_http_version 1.1;
  proxy_set_header Host $host;
  proxy_hide_header Cache-Control;
  proxy_hide_header Pragma;
  proxy_hide_header Expires;
  add_header Cache-Control "public, max-age=31536000, immutable";  # no `always`: 404s are not cached
}
```
Static SPA served by Nginx itself — see [react_spa_ssl.conf](./examples-nginx-configs/react_spa_ssl.conf)
(`/assets/` cached for a year, `index.html` with `no-cache`).

Check:
```shell
curl -s -D - -o /dev/null https://example.com/assets/index.js | grep -i cache-control   # public, max-age=31536000, immutable
curl -s -D - -o /dev/null https://example.com/              | grep -i cache-control   # no-cache / no-store
```

### Restart Nginx (docker compose) with script:
```shell
./restart.sh
```
