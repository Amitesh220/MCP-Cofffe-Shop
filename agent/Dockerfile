FROM node:20-alpine

# Install git for git operations
RUN apk add --no-cache git

# Configure git identity and safe directory at build time
# This prevents "Author identity unknown" and "dubious ownership" errors
RUN git config --global user.name "AI DevOps Agent" && \
    git config --global user.email "agent@ai-devops.local" && \
    git config --global --add safe.directory /app/workspace/repo && \
    git config --global --add safe.directory '*'

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

# Create workspace directory
RUN mkdir -p /app/workspace

EXPOSE 3001

CMD ["node", "server.js"]
