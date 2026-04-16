FROM node:20-alpine

# Install git for git operations
RUN apk add --no-cache git

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

# Create workspace directory
RUN mkdir -p /app/workspace

EXPOSE 3001

CMD ["node", "server.js"]
