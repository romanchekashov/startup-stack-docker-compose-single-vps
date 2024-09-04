FROM nginx:1.27.1-alpine
WORKDIR /home

# Delete files and directories in /home
RUN rm -rf /home/*

COPY nginx/sites-available ./sites-available

# Overwrite nginx.conf
COPY nginx/nginx.conf /etc/nginx/nginx.conf

# Delete files in /etc/nginx/conf.d/
RUN rm -rf /etc/nginx/conf.d/*

RUN cd /etc/nginx/conf.d/ && ln -s /home/sites-available/* ./
