#!/bin/bash
set -e

echo "Setting up Bun runtime environment..."

# Check if we need to run as sudo
SHOULD_USE_SUDO=false
if [ "$EUID" -ne 0 ]; then
    if command -v sudo &> /dev/null; then
        SHOULD_USE_SUDO=true
        echo "Running as non-root user, will use sudo for some operations"
    fi
fi

# Check if Bun is already installed and in PATH
if command -v bun &> /dev/null; then
    echo "✅ Bun is already installed and accessible"
    bun --version
    exit 0
fi

# Try to fix PATH issues first
echo "Bun not found in PATH, attempting to fix..."

# Get current user
CURRENT_USER=$(whoami)
USER_HOME=$(eval echo ~$CURRENT_USER)

# Check if .bun directory exists in user's home
if [ -d "$USER_HOME/.bun" ]; then
    echo "Found existing Bun installation directory at $USER_HOME/.bun"
    export BUN_INSTALL="$USER_HOME/.bun"
    export PATH="$BUN_INSTALL/bin:$PATH"
    
    # Check if bun is now accessible
    if command -v bun &> /dev/null; then
        echo "✅ Bun is now accessible after PATH update"
        bun --version
        
        # Ensure PATH is set in shell profile
        if ! grep -q "export BUN_INSTALL" "$USER_HOME/.bashrc"; then
            echo 'export BUN_INSTALL="$HOME/.bun"' >> "$USER_HOME/.bashrc"
            echo 'export PATH="$BUN_INSTALL/bin:$PATH"' >> "$USER_HOME/.bashrc"
            echo "Updated .bashrc with Bun PATH"
        fi
        
        exit 0
    fi
fi

# If we reach here, we need to reinstall Bun
echo "Reinstalling Bun..."

# Clean up any existing installation
if [ "$SHOULD_USE_SUDO" = true ]; then
    sudo rm -rf "$USER_HOME/.bun" || true
else
    rm -rf "$USER_HOME/.bun" || true
fi

# Install Bun
if [ "$CURRENT_USER" = "root" ]; then
    echo "Installing Bun as root..."
    curl -fsSL https://bun.sh/install | bash
else
    echo "Installing Bun as user $CURRENT_USER..."
    curl -fsSL https://bun.sh/install | bash
fi

# Source the updated profile
export BUN_INSTALL="$USER_HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

# Verify installation
if command -v bun &> /dev/null; then
    echo "✅ Bun installation successful!"
    bun --version
    exit 0
else
    echo "❌ Bun installation failed"
    echo "Trying alternative installation method using npm..."
    
    if [ "$SHOULD_USE_SUDO" = true ]; then
        sudo npm install -g bun
    else
        npm install -g bun
    fi
    
    if command -v bun &> /dev/null; then
        echo "✅ Bun installed successfully via npm!"
        bun --version
        exit 0
    else
        echo "❌ All Bun installation methods failed"
        exit 1
    fi
fi 