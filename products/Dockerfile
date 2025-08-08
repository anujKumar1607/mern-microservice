FROM node:18-alpine

WORKDIR /app/products

COPY . .

RUN npm install

EXPOSE 8001

CMD ["npm", "start"]