# Development stage
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

EXPOSE 5001

ENV NODE_ENV=development
ENV PORT=5001

CMD ["node", "server.js"]
