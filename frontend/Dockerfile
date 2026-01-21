# Use a lightweight Node.js image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files first
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose the port Vite uses
EXPOSE 5173

# Run the dev server, ensuring it binds to 0.0.0.0 so Docker can see it
CMD ["npm", "run", "dev", "--", "--host"]