FROM public.ecr.aws/lambda/nodejs:18

# Install production dependencies first for better Docker layer caching.
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application source code.
COPY . .

# Lambda handler exposed by backend/server.js
CMD ["server.handler"]
