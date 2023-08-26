FROM node:20.5.1

WORKDIR /app

# Copy package files and install dependencies first (for better caching)
COPY package*.json ./

RUN npm install
# Uncomment the next line if you want to install only production dependencies
# RUN npm ci --only=production

COPY ./ ./

EXPOSE 1337

# Use ts-node-dev for development
CMD ["npx", "ts-node-dev", "src/app.ts"]

# Uncomment the next line for production (after setting up a build step)
# CMD ["node", "dist/app.js"]
