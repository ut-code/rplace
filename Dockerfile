FROM node:22-alpine3.18
WORKDIR /usr/docker/uplace/
COPY . .
RUN npm ci
RUN npx prisma generate
RUN npm run build
EXPOSE 3200
CMD npx prisma db push && npm run serve
