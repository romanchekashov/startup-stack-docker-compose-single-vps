Let’s Encrypt
---
To enable HTTPS on your website, you need to get a certificate (a type of file) from a Certificate Authority (CA). Let’s Encrypt is a CA. In order to get a certificate for your website’s domain from Let’s Encrypt, you have to demonstrate control over the domain. With Let’s Encrypt, you do this using software that uses the ACME protocol which typically runs on your web host.
- [Let’s Encrypt ](https://letsencrypt.org/getting-started/)

## Install `certbot` which supports subdomains (wildcard: `*.example.ovh`)
> Note: Instead of `*.example.ovh` you will use your own domain name from DNS provider!
- [certbot instructions for whildcard (subdomains)](https://certbot.eff.org/instructions?ws=nginx&os=ubuntufocal&tab=wildcard)
```shell
# Installing snap: https://snapcraft.io/docs/installing-snapd
# Installing snap on Ubuntu: https://snapcraft.io/docs/installing-snap-on-ubuntu
sudo apt update
sudo apt install snapd
# Install Certbot
sudo snap install --classic certbot
# Prepare the Certbot command
sudo ln -s /snap/bin/certbot /usr/bin/certbot
# Confirm plugin containment level
sudo snap set certbot trust-plugin-with-root=ok
# Install correct DNS plugin
# sudo snap install certbot-dns-<PLUGIN>
# Example: DNS provider is OVH
sudo snap install certbot-dns-ovh
```

## Set up credentials
- [Look this DNS Plugins which available for your DNS provider](https://eff-certbot.readthedocs.io/en/stable/using.html#dns-plugins)
- I will use [certbot-dns-ovh](https://certbot-dns-ovh.readthedocs.io/en/stable/) because I bought domain name from [ovh.com](https://www.ovh.com/)
- To obtain credentials I will use one of the following links:
  - [OVH Europe (endpoint: ovh-eu)](https://eu.api.ovh.com/createToken/)
  - [OVH North America (endpoint: ovh-ca)](https://ca.api.ovh.com/createToken/)
```shell
# use these rules while creating credentials
GET /domain/zone/*
PUT  /domain/zone/* 
POST  /domain/zone/* 
DELETE  /domain/zone/*
```
- Eventually I will get credentials as `ovh.ini` file:
```shell
# ovh.ini file example
# OVH API credentials used by Certbot
dns_ovh_endpoint = ovh-eu
dns_ovh_application_key = MDAwMDAwMDAwMDAw
dns_ovh_application_secret = MDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAw
dns_ovh_consumer_key = MDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAw
```
- To acquire a certificate for `*.example.ovh` with subdomains:
```shell
certbot certonly \
  --dns-ovh \
  --dns-ovh-credentials ~/.secrets/certbot/ovh.ini \
  -d *.example.ovh

# command above will create 2 files which actually symlink:
# Symlink is a file that stores a path to an existing target (file or directory) on any local or external volume.
/etc/letsencrypt/live/example.ovh/fullchain.pem
/etc/letsencrypt/live/example.ovh/privkey.pem
```
- [Certbot: Configuration of wildcard certificate with DNS OVH challenge](https://schh.medium.com/certbot-configuration-of-wildcard-certificate-with-dns-ovh-challenge-1ae6fc599751)

## Every 3 month need to renew certificate!
```
root@vmi1180579:/home# certbot certonly   --dns-ovh   --dns-ovh-credentials ~/.secrets/certbot/ovh.ini   -d *.example.ovh
Saving debug log to /var/log/letsencrypt/letsencrypt.log
Certificate not yet due for renewal

You have an existing certificate that has exactly the same domains or certificate name you requested and isn't close to expiry.
(ref: /etc/letsencrypt/renewal/example.ovh.conf)

What would you like to do?
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
1: Keep the existing certificate for now
2: Renew & replace the certificate (may be subject to CA rate limits)
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
Select the appropriate number [1-2] then [enter] (press 'c' to cancel): 2
Renewing an existing certificate for *.example.ovh
Unsafe permissions on credentials configuration file: ~/.secrets/certbot/ovh.ini
Waiting 120 seconds for DNS changes to propagate

Successfully received certificate.
```
```shell
cd /home/
certbot certonly   --dns-ovh   --dns-ovh-credentials ~/.secrets/certbot/ovh.ini   -d *.example.ovh
# Enter 2 - to renew certificate
# Waiting 120 seconds for DNS changes to propagate
# Successfully received certificate.

service nginx restart  # or: /etc/init.d/nginx restart
```

## Automate certificate renewal
- Create `renewCerts.sh`:
```shell
#!/bin/bash

certbot certonly   --dns-ovh   --dns-ovh-credentials ~/.secrets/certbot/ovh.ini   -d *.example.ovh
```
- Make it executable:
```shell
chmod +x /home/renewCerts.sh
```
- Crontab Script For Generating Wildcard SSL Certificates:
```shell
nano /etc/crontab
# renew our certificates every 2 month
0 0 2 * * /home/renewCerts.sh

# save changes in /etc/crontab and restart cron
sudo systemctl restart cron
```
> Note: Although certificate is valid for 3 months it will be better to renew it every 2 months!
- Check up the date of your certificate:
```shell
cd /etc/letsencrypt/live/example.ovh
sudo openssl x509 -dates -noout < cert.pem
```
---

## Nginx set-up in VPS:
> Note: For Nginx set-up in docker look: [README.md](./README.md)
- [Configuring HTTPS servers](http://nginx.org/en/docs/http/configuring_https_servers.html)
- [Nginx: Create CSR & Install SSL Certificate (OpenSSL)](https://www.digicert.com/kb/csr-ssl-installation/nginx-openssl.htm)
- [How to Redirect HTTP to HTTPS in Nginx](https://phoenixnap.com/kb/redirect-http-to-https-nginx)
```shell
cd /etc/nginx/sites-available/
nano my_example_com.conf
# example of nginx config for site with subdomain: my.example.ovh
server {
  listen 80;
  server_name my.example.ovh;
  return 301 https://my.example.ovh$request_uri;
}

server {
  listen  443 ssl;
  http2   on;
  ssl_certificate        /etc/letsencrypt/live/example.ovh/fullchain.pem;
  ssl_certificate_key    /etc/letsencrypt/live/example.ovh/privkey.pem;

  server_name my.example.ovh;

  location / {
    proxy_pass http://localhost:3000;
  }

  location /api {
    proxy_pass http://localhost:3001;
  }
}

# test the configuration to make sure there are no errors
nginx -t               
# restart
service nginx restart  # or: /etc/init.d/nginx restart
```
