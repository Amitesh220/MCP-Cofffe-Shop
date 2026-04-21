# Build stage
FROM node:18 AS builder

WORKDIR /app

# Copy only package files first for better layer caching
COPY package*.json ./

RUN npm ci --prefer-offline --no-audit

# Copy source code
COPY . .

# Accept build-time cache buster argument to force clean builds
# This ensures UI changes are always picked up
ARG CACHE_BUST=default
ENV CACHE_BUST=$CACHE_BUST

# Build with explicit API URL pointing to backend service
ENV VITE_API_URL=http://backend:3000
RUN npm run build

# Validate build output
RUN if [ ! -f dist/index.html ]; then echo "Build failed: dist/index.html not found" && exit 1; fi
RUN if [ ! -d dist/assets ]; then echo "Build failed: dist/assets not found" && exit 1; fi

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install serve with explicit version for reproducibility
RUN npm install -g serve@14 --no-save

# Copy built artifacts from builder stage
COPY --from=builder /app/dist ./dist

# Expose port 80
EXPOSE 80

# Health check - ensure server responds on port 80
HEALTHCHECK --interval=5s --timeout=2s --retries=5 \
  CMD wget --quiet --tries=1 --spider http://localhost:80/ || exit 1

# Start serve in single-page app mode (redirects all routes to index.html)
CMD ["serve", "-s", "dist", "-l", "80"]

