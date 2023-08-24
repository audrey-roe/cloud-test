FROM node:20

WORKDIR /app

COPY ./ ./

# COPY package*.json ./

# RUN npm install --only=production

EXPOSE 1337

CMD ["npx", "ts-node-dev", "src/app.ts"]

# CMD ["npx", "ts-node", "src/app.ts"]

# CMD ["npm", "start"]
