FROM public.ecr.aws/lambda/nodejs:18

# Install production dependencies
WORKDIR /var/task
COPY package*.json ./
RUN npm ci --production

# Copy application code
COPY . .

# Lambda handler: module path + exported handler function
# server handler is exported at `src/server.handler`
CMD ["src/server.handler"]
