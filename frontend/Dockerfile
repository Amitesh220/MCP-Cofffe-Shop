FROM node:18-alpine

WORKDIR /app

COPY . .

RUN npm install
RUN npm run build

# FAIL SAFE CHECK
RUN if [ ! -d "dist" ]; then \
      echo "Build failed: dist missing"; \
      exit 1; \
    fi

RUN npm install -g serve

CMD ["serve", "-s", "dist", "-l", "80", "--no-cache"]
