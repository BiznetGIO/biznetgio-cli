# Biznet Gio CLI & MCP Server
# Build and publish toolchain

SHELL := /bin/bash

# Directories
CLI_DIR := biznetgio-cli
MCP_DIR := biznetgio-mcp-server
DIST_DIR := dist

# Entry points
CLI_ENTRY := $(CLI_DIR)/bin/biznetgio.js
MCP_ENTRY := $(MCP_DIR)/src/index.js

# Binary output names
CLI_BIN := biznetgio
MCP_BIN := biznetgio-mcp

# Platforms for cross-compilation
PLATFORMS := linux-x64 linux-arm64 darwin-x64 darwin-arm64

# ─────────────────────────────────────────────
# Default
# ─────────────────────────────────────────────

.PHONY: help
help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ─────────────────────────────────────────────
# Install
# ─────────────────────────────────────────────

.PHONY: install
install: install-cli install-mcp ## Install dependencies for both projects

.PHONY: install-cli
install-cli: ## Install CLI dependencies
	cd $(CLI_DIR) && npm install

.PHONY: install-mcp
install-mcp: ## Install MCP server dependencies
	cd $(MCP_DIR) && npm install

# ─────────────────────────────────────────────
# Build binaries (current platform)
# ─────────────────────────────────────────────

.PHONY: build
build: build-cli build-mcp ## Build binaries for current platform

.PHONY: build-cli
build-cli: ## Build CLI binary for current platform
	@mkdir -p $(DIST_DIR)
	bun build $(CLI_ENTRY) --compile --minify --outfile $(DIST_DIR)/$(CLI_BIN)
	@echo "Built: $(DIST_DIR)/$(CLI_BIN)"

.PHONY: build-mcp
build-mcp: ## Build MCP server binary for current platform
	@mkdir -p $(DIST_DIR)
	bun build $(MCP_ENTRY) --compile --minify --outfile $(DIST_DIR)/$(MCP_BIN)
	@echo "Built: $(DIST_DIR)/$(MCP_BIN)"

# ─────────────────────────────────────────────
# Build binaries (cross-platform)
# ─────────────────────────────────────────────

.PHONY: build-all
build-all: build-all-cli build-all-mcp ## Build binaries for all platforms

.PHONY: build-all-cli
build-all-cli: ## Build CLI binaries for all platforms
	@mkdir -p $(DIST_DIR)
	@for platform in $(PLATFORMS); do \
		echo "Building $(CLI_BIN)-$$platform..."; \
		bun build $(CLI_ENTRY) --compile --minify \
			--target=bun-$$platform \
			--outfile $(DIST_DIR)/$(CLI_BIN)-$$platform; \
	done
	@echo "CLI binaries built for: $(PLATFORMS)"

.PHONY: build-all-mcp
build-all-mcp: ## Build MCP server binaries for all platforms
	@mkdir -p $(DIST_DIR)
	@for platform in $(PLATFORMS); do \
		echo "Building $(MCP_BIN)-$$platform..."; \
		bun build $(MCP_ENTRY) --compile --minify \
			--target=bun-$$platform \
			--outfile $(DIST_DIR)/$(MCP_BIN)-$$platform; \
	done
	@echo "MCP binaries built for: $(PLATFORMS)"

# ─────────────────────────────────────────────
# Publish to npm
# ─────────────────────────────────────────────

.PHONY: publish
publish: publish-cli publish-mcp ## Publish both packages to npm

.PHONY: publish-cli
publish-cli: ## Publish @biznetgio/cli to npm
	cd $(CLI_DIR) && npm publish --access public

.PHONY: publish-mcp
publish-mcp: ## Publish @biznetgio/mcp to npm
	cd $(MCP_DIR) && npm publish --access public

.PHONY: publish-dry
publish-dry: publish-dry-cli publish-dry-mcp ## Dry run publish for both packages

.PHONY: publish-dry-cli
publish-dry-cli: ## Dry run publish @biznetgio/cli
	cd $(CLI_DIR) && npm publish --access public --dry-run

.PHONY: publish-dry-mcp
publish-dry-mcp: ## Dry run publish @biznetgio/mcp
	cd $(MCP_DIR) && npm publish --access public --dry-run

# ─────────────────────────────────────────────
# Version bump
# ─────────────────────────────────────────────

.PHONY: version-patch
version-patch: ## Bump patch version (x.x.X) for both packages
	cd $(CLI_DIR) && npm version patch --no-git-tag-version
	cd $(MCP_DIR) && npm version patch --no-git-tag-version
	@echo "Bumped patch version"

.PHONY: version-minor
version-minor: ## Bump minor version (x.X.0) for both packages
	cd $(CLI_DIR) && npm version minor --no-git-tag-version
	cd $(MCP_DIR) && npm version minor --no-git-tag-version
	@echo "Bumped minor version"

.PHONY: version-major
version-major: ## Bump major version (X.0.0) for both packages
	cd $(CLI_DIR) && npm version major --no-git-tag-version
	cd $(MCP_DIR) && npm version major --no-git-tag-version
	@echo "Bumped major version"

# ─────────────────────────────────────────────
# Test
# ─────────────────────────────────────────────

.PHONY: test
test: test-cli test-mcp ## Run all tests

.PHONY: test-cli
test-cli: ## Run CLI tests
	bash scripts/test-cli.sh

.PHONY: test-mcp
test-mcp: ## Run MCP server tests
	bash scripts/test-mcp.sh

.PHONY: test-live
test-live: ## Run all tests with live API calls
	bash scripts/test-all.sh --live

# ─────────────────────────────────────────────
# Clean
# ─────────────────────────────────────────────

.PHONY: clean
clean: ## Remove build artifacts
	rm -rf $(DIST_DIR)
	@echo "Cleaned $(DIST_DIR)/"

.PHONY: clean-all
clean-all: clean ## Remove build artifacts and node_modules
	rm -rf $(CLI_DIR)/node_modules $(MCP_DIR)/node_modules
	@echo "Cleaned node_modules"

# ─────────────────────────────────────────────
# Release workflow
# ─────────────────────────────────────────────

.PHONY: release-patch
release-patch: version-patch build-all publish ## Bump patch, build all, publish

.PHONY: release-minor
release-minor: version-minor build-all publish ## Bump minor, build all, publish

.PHONY: release-major
release-major: version-major build-all publish ## Bump major, build all, publish
