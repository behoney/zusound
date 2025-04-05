#!/bin/bash
set -e

echo "Initializing zusound development environment..."

# Print environment info
echo "User: $(whoami)"
echo "Node.js version: $(node --version)"
echo "NPM version: $(npm --version)"

# Ensure proper file permissions
echo "Checking file permissions..."
if [ -d "/workspace/node_modules" ]; then
    # Use sudo only if needed
    if [ "$(stat -c '%U' /workspace/node_modules)" != "node" ]; then
        echo "Fixing node_modules ownership..."
        sudo chown -R node:node /workspace/node_modules
    fi
fi

# Ensure Bun is properly installed
echo "Checking Bun installation..."
if ! command -v bun &> /dev/null; then
    echo "Bun not found, running setup script..."
    sudo bash /usr/local/bin/setup-bun.sh
else
    echo "✅ Bun is available: $(bun --version)"
fi

# Check for package.json and install dependencies if needed
if [ -f "/workspace/package.json" ]; then
    echo "Found package.json, checking dependencies..."
    if [ ! -d "/workspace/node_modules" ] || [ ! -f "/workspace/bun.lockb" ]; then
        echo "Installing dependencies with Bun..."
        cd /workspace
        bun install
    else
        echo "Dependencies already installed"
    fi
fi

# Make sure path is set correctly
if ! grep -q "BUN_INSTALL" ~/.bashrc; then
    echo "Adding Bun to PATH in .bashrc..."
    echo 'export BUN_INSTALL="$HOME/.bun"' >> ~/.bashrc
    echo 'export PATH="$BUN_INSTALL/bin:$PATH"' >> ~/.bashrc
fi

echo "✅ Development environment initialized successfully!"
echo "To get started, run: bun run dev" 