# 🍣 Sushi — SUpervisor of SHIfts

A helpdesk team portal for managing shift scheduling, announcements, polls, and daily tasks.
Built for a team of ~100 technicians across 3 support teams (Cell Phone, Network, OS Support).

## Features

### Shift Scheduling (משמרות)
- **Tech view:** Select available days (Sun–Thu), pick preferred team per day
- **Manager view:** Dashboard with coverage per team/day, assign techs to slots
- Configurable seats per team per month
- Qualification tracking (which teams each tech can work on)

### Portal
- **MOTD / Announcements (הודעות):** Post daily messages, pin important ones
- **Polls (סקרים):** Create polls with multiple options, single/multi-vote
- **Daily Tasks (משימות):** Checklist with completion tracking

### Access Control (הרשאות)
- 4 roles: מנהלת (Manager), אחראי משמרת (Team Lead), טכנאי בכיר (Senior Tech), טכנאי (Tech)
- **Modular permissions** — manager controls what each role can do via a friendly grid UI
- OIDC group → role mapping with in-app override

### Authentication
- OIDC via Keycloak or Entra ID
- Dev mode: quick-login buttons for demo users
- Role derived from OIDC groups, overridable in-app

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Backend | Django 5.1 + DRF |
| Frontend | React 18 + Vite + Tailwind CSS |
| Database | PostgreSQL 16 |
| Auth | mozilla-django-oidc (Keycloak / Entra ID) |
| UI | Hebrew RTL, Heebo font |

## Quick Start

### Prerequisites
- Docker & Docker Compose (or OrbStack)
- Git

### Clone & Run

```bash
git clone git@github.com:kofadam/sushi.git
cd sushi
docker compose up --build
```

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000/api/
- **Django Admin:** http://localhost:8000/admin/

The `seed_data` command runs automatically and creates default permissions, roles, teams, and demo users.

### Development Mode (Vite HMR)

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

- **Frontend (Vite):** http://localhost:5173
- **Backend:** http://localhost:8000

### Running without Docker

```bash
# Backend
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
# Set DB env vars or use a local PostgreSQL
python manage.py migrate
python manage.py seed_data --with-demo-users
python manage.py runserver

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

## Kubernetes Deployment (VKS)

1. Build and push images to Harbor:
```bash
docker build -t harbor.yourdomain.local/sushi/backend:latest ./backend
docker build -t harbor.yourdomain.local/sushi/frontend:latest ./frontend
docker push harbor.yourdomain.local/sushi/backend:latest
docker push harbor.yourdomain.local/sushi/frontend:latest
```

2. Edit `k8s/sushi.yaml`:
   - Update Harbor registry URL
   - Update OIDC endpoints for your Keycloak realm
   - Update FQDN (`sushi.yourdomain.local`)
   - Update TLS secret name for your wildcard cert
   - Set real values in the Secret resource

3. Apply:
```bash
kubectl apply -f k8s/sushi.yaml
```

4. Seed initial data:
```bash
kubectl -n sushi exec deploy/sushi-backend -- python manage.py seed_data
```

## OIDC Configuration

### Keycloak
1. Create client `sushi` in your realm
2. Valid Redirect URIs: `https://sushi.yourdomain.local/oidc/callback/`
3. Create groups: `sushi-managers`, `sushi-team-leads`, `sushi-senior-techs`
4. Add a `groups` client scope (or use existing group mapper)
5. Assign users to groups

### Entra ID
1. Register an application in Azure AD
2. Redirect URI: `https://sushi.yourdomain.local/oidc/callback/`
3. Configure group claims in token configuration
4. Map group Object IDs to env vars

## Project Structure

```
sushi/
├── backend/
│   ├── sushi_project/       # Django project settings & URLs
│   ├── core/                # User, Role, Permission, Team models
│   ├── scheduling/          # MonthConfig, Preferences, Assignments
│   ├── portal/              # Announcements, Polls, DailyTasks
│   ├── authentication/      # OIDC backend, dev login
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/             # API client
│   │   ├── components/      # Shared UI components (RTL Hebrew)
│   │   ├── contexts/        # Auth context
│   │   ├── pages/           # Page components
│   │   └── utils/           # Date/calendar helpers
│   ├── Dockerfile
│   └── nginx.conf
├── k8s/
│   └── sushi.yaml           # Full K8s manifests + Contour HTTPProxy
├── docker-compose.yml
└── docker-compose.dev.yml
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DJANGO_SECRET_KEY` | Django secret key | dev value |
| `DJANGO_DEBUG` | Debug mode | `true` |
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_NAME` | Database name | `sushi` |
| `DB_USER` | Database user | `sushi` |
| `DB_PASSWORD` | Database password | `sushi` |
| `OIDC_RP_CLIENT_ID` | OIDC client ID | — |
| `OIDC_RP_CLIENT_SECRET` | OIDC client secret | — |
| `OIDC_OP_AUTHORIZATION_ENDPOINT` | OIDC auth endpoint | — |
| `OIDC_OP_TOKEN_ENDPOINT` | OIDC token endpoint | — |
| `OIDC_OP_USER_ENDPOINT` | OIDC userinfo endpoint | — |
| `OIDC_OP_JWKS_ENDPOINT` | OIDC JWKS endpoint | — |
| `OIDC_GROUPS_CLAIM` | Claim containing groups | `groups` |
| `OIDC_MANAGER_GROUP` | Group for managers | `sushi-managers` |
| `OIDC_TEAM_LEAD_GROUP` | Group for team leads | `sushi-team-leads` |
| `OIDC_SENIOR_TECH_GROUP` | Group for senior techs | `sushi-senior-techs` |

## Roadmap
- [ ] Auto-assignment algorithm (fair distribution based on preferences + qualifications)
- [ ] Shift swap requests between techs
- [ ] Email/Teams notifications
- [ ] Export to Excel/PDF
- [ ] Historical reporting and analytics
- [ ] Vacation/sick day calendar integration
- [ ] Mobile PWA support
