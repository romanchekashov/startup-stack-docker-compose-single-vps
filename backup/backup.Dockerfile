FROM node:23-alpine

WORKDIR /home

RUN apk add --update docker openrc
RUN rc-update add docker boot

COPY backup/package.json .
COPY backup/package-lock.json .
RUN npm install

COPY backup/nodemon.json .
COPY backup/tsconfig* .
COPY backup/src ./src

RUN npm run build

CMD ["node", "build/index.js"]
ARG PORT
EXPOSE ${PORT}
