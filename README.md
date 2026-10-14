# CRM API

Express REST API for employee authentication and lead ownership, backed by MongoDB.

## Run

```bash
npm install
copy .env.example .env
# Set MONGODB_URI and a JWT_SECRET with at least 32 characters.
npm start
```

The API creates the required indexes on startup. `npm test` runs the automated API tests
with an in-memory MongoDB instance, and `npm run check` verifies the acceptance criteria.

## Endpoints

| Method | Path                       | Auth | Purpose                                          |
| ------ | -------------------------- | ---- | ------------------------------------------------ |
| POST   | `/api/auth/register`       | No   | Register an employee and return a JWT            |
| POST   | `/api/auth/login`          | No   | Log in an employee and return a JWT              |
| POST   | `/api/enquiries`           | No   | Submit a public enquiry                          |
| GET    | `/api/enquiries/unclaimed` | JWT  | List all unclaimed enquiries                     |
| POST   | `/api/enquiries/:id/claim` | JWT  | Atomically claim an enquiry                      |
| GET    | `/api/enquiries/mine`      | JWT  | List enquiries claimed by the logged-in employee |

Use the token with `Authorization: Bearer <token>`.

## Environment

- `MONGODB_URI`: MongoDB connection string.
- `MONGODB_DB`: database name (defaults to `crm`).
- `JWT_SECRET`: random secret of at least 32 characters.
- `JWT_EXPIRES_IN`: token lifetime (defaults to `8h`).
- `CORS_ORIGINS`: comma-separated allowed browser origins; empty disables cross-origin access.
