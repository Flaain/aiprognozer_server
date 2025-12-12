FROM node:24-alpine as base

WORKDIR /app

COPY package.json npm-shrinkwrap.json ./

RUN npm install

FROM base as build

COPY . .

RUN npm run build

FROM node:24-alpine as production

WORKDIR /app

COPY --from=build /app/package.json /app/npm-shrinkwrap.json ./

RUN npm install --production && npm cache clean --force

COPY --from=build /app/dist ./dist

RUN chown -R node:node /app

USER node

COPY --from=build /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/main"]