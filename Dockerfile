# Use electron-builder image with Wine for cross-platform builds
FROM electronuserland/builder:wine

# Set working directory
WORKDIR /project

# Install pnpm globally
RUN npm install -g pnpm@9 --loglevel=error

# Copy package files first (for better caching)
COPY package.json pnpm-lock.yaml ./

# Install dependencies (will be cached if package.json unchanged)
RUN pnpm install --frozen-lockfile --prefer-offline

# Copy all project files
COPY . .

# Note: Build happens at runtime, not during image build
# This keeps the image reusable and allows for clean builds

# Default command
CMD ["pnpm", "run", "dist:docker"]
