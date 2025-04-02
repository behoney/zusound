FROM node:20-bullseye

# Update and install system dependencies
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends \
    git \
    curl \
    wget \
    unzip \
    zip \
    build-essential \
    ca-certificates \
    gnupg \
    lsb-release \
    sudo \
    vim \
    less \
    jq \
    htop \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user with sudo access
ARG USERNAME=node
ARG USER_UID=1000
ARG USER_GID=$USER_UID

# Ensure the node user has sudo capabilities 
RUN mkdir -p /etc/sudoers.d && \
    echo "$USERNAME ALL=(ALL:ALL) NOPASSWD: ALL" > /etc/sudoers.d/$USERNAME && \
    chmod 0440 /etc/sudoers.d/$USERNAME

# Set up user's npm directory
RUN mkdir -p /home/$USERNAME/.npm-global && \
    chown -R $USERNAME:$USERNAME /home/$USERNAME/.npm-global && \
    echo "export NPM_CONFIG_PREFIX=~/.npm-global" >> /home/$USERNAME/.bashrc && \
    echo "export PATH=~/.npm-global/bin:\$PATH" >> /home/$USERNAME/.bashrc

# Install global dev tools as root (fixes permission issues)
RUN npm install -g npm@latest typescript ts-node eslint prettier

# Install Bun as root first
RUN curl -fsSL https://bun.sh/install | bash && \
    echo 'export BUN_INSTALL="/root/.bun"' >> /root/.bashrc && \
    echo 'export PATH="/root/.bun/bin:$PATH"' >> /root/.bashrc

# Now set up Bun for the node user
RUN mkdir -p /home/$USERNAME/.bun && \
    cp -r /root/.bun/* /home/$USERNAME/.bun/ && \
    chown -R $USERNAME:$USERNAME /home/$USERNAME/.bun && \
    echo 'export BUN_INSTALL="$HOME/.bun"' >> /home/$USERNAME/.bashrc && \
    echo 'export PATH="$BUN_INSTALL/bin:$PATH"' >> /home/$USERNAME/.bashrc

# Switch to the node user for subsequent operations
USER $USERNAME

# Set environment variables
ENV NODE_ENV=development \
    PATH=/home/node/.npm-global/bin:/home/node/.bun/bin:$PATH

# Set default working directory
WORKDIR /workspace

# Switch back to root to set up workspace permissions
USER root
RUN mkdir -p /workspace/node_modules && \
    chown -R $USERNAME:$USERNAME /workspace

# Add helper scripts
COPY scripts/setup-bun.sh /usr/local/bin/setup-bun.sh
RUN mkdir -p /usr/local/bin && \
    echo '#!/bin/bash\necho "Container shell starting..."\nif ! command -v bun > /dev/null; then\n  echo "Bun not found, attempting to fix PATH"\n  export PATH="/home/node/.bun/bin:$PATH"\n  if ! command -v bun > /dev/null; then\n    echo "Reinstalling bun..."\n    curl -fsSL https://bun.sh/install | bash\n  fi\nfi\nexec "$@"' > /usr/local/bin/entrypoint.sh && \
    chmod +x /usr/local/bin/entrypoint.sh /usr/local/bin/setup-bun.sh

# Final switch to user
USER $USERNAME
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["bash"] 