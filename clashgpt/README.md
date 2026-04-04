# ClashGPT Backend

The Python backend for ClashGPT, built with FastAPI, Google Agent Development Kit (ADK), and Supabase. It provides the REST API and serves the AI agent powered by Gemini.

## 🛠 Tech Stack

- **Framework**: FastAPI (Python)
- **AI Stack**: Google Agent Development Kit (ADK), Gemini AI
- **Database**: PostgreSQL (via Supabase)
- **Package Manager**: uv

## 📁 Project Structure

```
clashgpt/
├── app/
│   ├── agent.py         # AI agent powered by ADK
│   ├── fast_api_app.py  # REST API server (Uvicorn/FastAPI)
│   ├── tools/           # Agent tools (card, deck, player, clan)
│   ├── services/        # External API clients
│   └── models/          # Data models
├── tests/               # Backend tests
├── Makefile             # Backend commands
├── pyproject.toml       # Python dependencies
└── README.md            # This documentation
```

## 🚀 Getting Started

### Installation

Install `uv` and dependencies natively:
```bash
make install
```

### Environment Requirements

Set up `.env` containing your database connection strings (Supabase), Gemini AI environment keys, and other related configs.

### Running Locally

Run the continuous development server (FastAPI):
```bash
make local-backend
```

Run the ADK agent playground to test tools iteratively:
```bash
make playground
```
This starts the playground on `localhost:8501`.

### Formatting, Testing & Quality

Format python files and run checks via mypy and ruff:
```bash
make lint
```

Run unit and integration tests:
```bash
make test
```

## ☁️ Deployment

The backend is deployed to Google Cloud Run natively via `gcloud`. It leverages CI/CD capabilities via git commit hashes.

Deploy the backend seamlessly:
```bash
make deploy
```

Deploy with `.env` file variables exposed via Google Cloud Secret Manager / Config:
```bash
make deploy-env
```
