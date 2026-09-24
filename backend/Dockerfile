FROM node:20-alpine

WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm install

COPY shared /app/shared
COPY backend .
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]
