FROM node:22-alpine
LABEL authors="W09C-Almond"

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 9900

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
