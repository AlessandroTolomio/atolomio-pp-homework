FROM node:18-slim

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN mkdir -p pdfs public

EXPOSE 3001
CMD ["tail", "-f", "/dev/null"]