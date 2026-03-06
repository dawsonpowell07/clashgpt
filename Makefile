.PHONY: start pre-deploy format build

# Start both frontend and backend development servers concurrently
start:
	@echo "Starting frontend and backend..."
	@trap 'kill 0' SIGINT; \
	cd clashgpt && make local-backend & \
	cd frontend && npm run dev & \
	wait

# Run code formatting and linting for both frontend and backend
format:
	@echo "Formatting backend code (ruff)..."
	cd clashgpt && uv run ruff format .
	cd clashgpt && uv run ruff check . --fix
	@echo "Formatting/linting frontend code..."
	cd frontend && npm run lint

# Build frontend
build:
	@echo "Building frontend..."
	cd frontend && npm run build

# Pre-deploy command that runs formatting, linting, and building
pre-deploy: format build
	@echo "Pre-deployment checks passed successfully! Ready to deploy."
