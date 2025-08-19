FROM node:18-alpine

WORKDIR /app/products

COPY . .

RUN npm install

EXPOSE 8002

CMD ["npm", "start"]