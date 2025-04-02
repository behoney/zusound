# zusound Development Container

This directory contains configuration for a development container that provides a consistent environment for working on the zusound project.

## Features

- Node.js 20 environment
- Bun runtime pre-installed
- Essential development tools
- Pre-configured VS Code extensions for TypeScript and React development

## Usage

### Prerequisites

1. Install [Docker](https://www.docker.com/products/docker-desktop/)
2. Install [VS Code](https://code.visualstudio.com/)
3. Install the [Remote - Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) extension in VS Code

### Opening the Project in a Container

1. Open VS Code
2. Open the zusound project folder
3. When prompted, click "Reopen in Container" or press F1 and select "Remote-Containers: Reopen in Container"
4. Wait for the container to build and initialize

### Manual Container Building

If needed, you can manually rebuild the container:

1. Press F1 in VS Code
2. Select "Remote-Containers: Rebuild Container"

## Customization

If you need to customize the development environment:

- Edit `Dockerfile` to modify the container image
- Edit `devcontainer.json` to change VS Code settings or extensions

## Troubleshooting

- If you encounter issues with port forwarding, ensure ports 3000 is not in use by other applications
- For performance issues on macOS, ensure Docker Desktop has adequate resources allocated
