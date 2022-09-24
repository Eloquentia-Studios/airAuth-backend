FROM node:18.9.0-alpine3.16

WORKDIR /app

COPY package.json ./

RUN npm install

COPY . .

EXPOSE 8080

ENTRYPOINT /bin/sh ./docker-dev-start.sh