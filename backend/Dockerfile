FROM public.ecr.aws/lambda/nodejs:18

# Set deployment target for AWS Lambda
ENV DEPLOYMENT_TARGET=aws
ENV NODE_ENV=production

# Install production dependencies first for better Docker layer caching.
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application source code.
COPY . .

# Lambda handler exposed by backend/server.js
CMD ["server.handler"]
