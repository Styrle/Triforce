.PHONY: dev up down logs test migrate seed build deploy clean help

# Development
dev: ## Start development environment
	docker-compose up -d postgres redis
	@echo "Waiting for services to be ready..."
	@sleep 3
	@echo "Starting backend..."
	cd backend && npm run dev

up: ## Start all services with Docker
	docker-compose up -d
	@echo "Services starting..."
	@sleep 5
	docker-compose logs -f backend frontend

down: ## Stop all services
	docker-compose down

logs: ## View logs
	docker-compose logs -f

# Database
migrate: ## Run database migrations
	cd backend && npx prisma migrate dev

migrate-prod: ## Run production migrations
	cd backend && npx prisma migrate deploy

seed: ## Seed the database
	cd backend && npx prisma db seed

reset-db: ## Reset database (WARNING: destroys data)
	cd backend && npx prisma migrate reset --force

studio: ## Open Prisma Studio
	cd backend && npx prisma studio

# Testing
test: ## Run all tests
	cd backend && npm test

test-watch: ## Run tests in watch mode
	cd backend && npm run test:watch

test-coverage: ## Run tests with coverage report
	cd backend && npm test -- --coverage

# Linting
lint: ## Run linters
	cd backend && npm run lint
	cd frontend && npm run lint

lint-fix: ## Fix linting issues
	cd backend && npm run lint:fix
	cd frontend && npm run lint:fix

# Build
build: ## Build for production
	cd backend && npm run build
	cd frontend && npm run build

build-docker: ## Build Docker images
	docker-compose -f docker-compose.prod.yml build

# Deployment (Digital Ocean)
deploy: ## Deploy to Digital Ocean (requires doctl configured)
	@echo "Building and pushing images..."
	docker-compose -f docker-compose.prod.yml build
	@echo "Deployment steps:"
	@echo "1. Push to your container registry"
	@echo "2. Update your Digital Ocean App Platform or Droplet"
	@echo "See README.md for full deployment instructions"

# Installation
install: ## Install all dependencies
	cd backend && npm ci
	cd frontend && npm ci
	cd backend && npx prisma generate

# Cleanup
clean: ## Clean build artifacts and dependencies
	rm -rf backend/dist
	rm -rf backend/node_modules
	rm -rf frontend/dist
	rm -rf frontend/node_modules
	rm -rf backend/coverage

# Help
help: ## Show this help
	@echo "TriForce - Triathlon Training Platform"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

# Default
.DEFAULT_GOAL := help
