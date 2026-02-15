# Use electron-builder image with Wine for cross-platform builds
FROM electronuserland/builder:wine

# Set working directory
WORKDIR /project

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy project files
COPY . .

# Build the app
RUN pnpm run build

# Default command builds for all platforms
CMD ["pnpm", "run", "dist:all"]
