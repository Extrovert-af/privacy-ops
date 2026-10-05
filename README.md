# PrivacyOps

A privacy compliance platform for running PIA / DPIA assessments end to end:
intake, templated questionnaires per regulation, risk register, multi-stage
review, approval, real PDF/Word export, re-review cycles and compliance
reporting.

## Quick start

```bash
npm install
cp .env.example .env      # then edit AUTH_SECRET
npm run db:migrate        # create the database
npm run db:seed           # load the demo users and sample data
npm run dev
```

Open <http://localhost:3000> and sign in with any demo account:

| Email | Password | Role |
| --- | --- | --- |
| sarah@privacyops.com | password123 | admin |
| marcus@privacyops.com | password123 | privacy_officer |
| priya@privacyops.com | password123 | reviewer |
| tom@privacyops.com | password123 | assessor |
| emma@privacyops.com | password123 | viewer |

> These are throwaway demo credentials. Change or remove them before this app
> is reachable by anyone you do not know.

## Roles

| Capability | viewer | assessor | reviewer | privacy_officer | admin |
| --- | :-: | :-: | :-: | :-: | :-: |
| View dashboards and reports | yes | yes | yes | yes | yes |
| Create/edit assessments | | yes | yes | yes | yes |
| Advance workflow, approve, reject | | | yes | yes | yes |
| Create and edit risks | | yes | yes | yes | yes |
| Delete risks | | | yes | yes | yes |
| Delete assessments | | | | yes | yes |
| View internal compliance metrics | | | yes | yes | yes |
| Manage users and roles | | | | | yes |

Permissions are enforced in the API, not just hidden in the UI.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server on port 3000 |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Apply migrations (and regenerate the Prisma client) |
| `npm run db:seed` | Reset to demo data — **destructive** |
| `npm run db:reset` | Drop, re-migrate and re-seed — **destructive** |
| `npm run db:studio` | Browse the data in a web UI |

## How it is put together

```
prisma/
  schema.prisma        User, Assessment, Risk, ActivityLog,
                       Notification, LoginAttempt
  seed.ts              demo data
src/
  auth.ts              Auth.js credentials provider, login throttling
  proxy.ts             route guard (redirects to /login)
  lib/
    prisma.ts          database client singleton
    validation.ts      input validation helpers used by every API route
    rate-limit.ts      brute-force protection (persisted, not in-memory)
    deadlines.ts       due-date / overdue / re-review logic
    risk.ts            severity banding (single source of truth)
    document-builder.ts PDF + DOCX report generation
    notifications.ts   deadline reminder generation
    storage.ts         typed API client for the browser
  app/
    api/               REST endpoints
    dashboard|assessments|workflow|risks|documents|compliance|users/
src/data/
  templates.ts         per-regulation questionnaire templates
  organization.ts      regulation metadata
```

Supported regulations: **GDPR, CCPA/CPRA, HIPAA, PIPEDA, DPDPA, PIPL**.

## API

All endpoints require a session (`401` otherwise) and take a JSON body.

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/assessments` | List |
| POST | `/api/assessments` | Create (draft) |
| GET/PUT/DELETE | `/api/assessments/[id]` | Delete needs privacy_officer+ |
| POST | `/api/assessments/[id]/re-review` | Start a new review cycle on a closed assessment |
| GET/POST | `/api/risks` | Create blocked for viewers |
| PUT/DELETE | `/api/risks/[id]` | Delete needs reviewer+ |
| GET/POST | `/api/users` | POST is admin-only |
| PUT/DELETE | `/api/users/[id]` | Role/active changes are admin-only |
| GET | `/api/activities` | Audit feed |
| GET | `/api/compliance` | Metrics; slim payload for non-reviewer roles |
| GET | `/api/documents/[id]?format=pdf\|docx` | Real PDF/Word export; approved or closed only |
| GET/POST | `/api/notifications` | Per-user alerts |
| POST | `/api/notifications/generate` | Scan deadlines and raise alerts (idempotent) |
| POST | `/api/auth/register` | Self-service signup, always creates a viewer |

## Security

- Passwords hashed with bcrypt (cost 12). Login always runs a bcrypt
  comparison so response timing does not reveal whether an account exists.
- Failed sign-ins are counted per account and per source address, persisted in
  the `LoginAttempt` table. 8 attempts triggers a 15-minute lockout. Because it
  is stored in the database it survives server restarts and works across
  serverless instances.
- The last active admin cannot be demoted, deactivated or deleted, so you
  cannot lock yourself out.
- Self-service registration can only ever create a `viewer`.
- Security headers (CSP, HSTS, X-Frame-Options, Referrer-Policy,
  Permissions-Policy) are set for every response in `next.config.ts`.
- Every API route validates and length-limits its input; the database is only
  ever reached through parameterised Prisma queries.
- Deleting a user who still owns assessments or risks deactivates the account
  instead of deleting it, so the audit trail stays intact.

## Deploying

The app currently targets **SQLite**, which works for local use. Serverless
hosts such as Vercel have an ephemeral, read-only filesystem, so **SQLite will
not persist in production.** To deploy, switch to a hosted Postgres:

1. Create a free Postgres database (Neon or Supabase both have free tiers).
2. Change the datasource in `prisma/schema.prisma`:

   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

3. Point `DATABASE_URL` at the hosted database.
4. Generate migrations for Postgres and apply them:

   ```bash
   npx prisma migrate dev --name init_postgres   # locally, to produce SQL
   npx prisma migrate deploy                     # on the host
   npm run db:seed                               # first time only
   ```

5. Set `AUTH_SECRET` and `AUTH_TRUST_HOST=true` in the host's environment
   variables, using a **freshly generated** secret.
6. Deploy.

## Known limitations

- Reminders are generated on demand via the "Send deadline reminders" button or
  `POST /api/notifications/generate`. There is no scheduler, so nothing runs it
  automatically — add a cron job (Vercel Cron, or a GitHub Action) for that.
- Documents include the recorded answers and risk register, but no company logo
  or digital signature.
- No email delivery; notifications are in-app only.
- `npm audit` reports known advisories in the transitive dependency tree.
