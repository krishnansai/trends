FROM apify/actor-node-playwright:20 AS runner

WORKDIR /usr/src/app

ENV PORT=4000

COPY package*.json ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src
RUN npm run build
RUN npm prune --omit=dev

ENV NODE_ENV=production

EXPOSE 4000

CMD ["npm", "start"]
