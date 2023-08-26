# Using a more specific node version is generally recommended
FROM node:20

# Set working directory
WORKDIR /app

# Copy package files and install dependencies first (for better caching)
COPY package*.json ./
RUN npm install
# Uncomment the next line if you want to install only production dependencies
# RUN npm ci --only=production

# Copy the rest of the application
COPY ./ ./

# Expose the necessary port
EXPOSE 3001

# Use ts-node-dev for development
CMD ["npm", "start"]

# Uncomment the next line for production (after setting up a build step)
# CMD ["node", "dist/app.js"]
