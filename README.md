# Medical Health Records API

A secure Node.js + PostgreSQL backend for managing patients, appointments, and medical
records in a healthcare setting. The service demonstrates how digitized records and
role-aware workflows improve care coordination, patient access, and operational
visibility across a clinic or hospital team.

## Key Features

- **JWT authentication** with password hashing to protect all private endpoints.
- **Role-based access control** for Admin, Manager, Staff, Doctor, and Patient
  personas. Each role has scoped capabilities aligned with day-to-day healthcare
  responsibilities.
- **Comprehensive patient profiles** that capture demographics, contact
  information, emergency contacts, and medical history while linking to the
  authenticated patient account when available.
- **Appointment scheduling and management** that supports booking, updating, and
  canceling visits while tracking the responsible clinician and creator.
- **Clinical documentation** via medical records that capture encounters,
  diagnoses, treatment plans, and optional attachments.
- **Administrative analytics** including live role counts, patient totals,
  scheduled visits, and documented encounters to highlight operational impact.
- **Database migrations and demo data** for repeatable environment setup.

## Tech Stack

- Node.js 18+
- Express 5
- PostgreSQL 13+
- Sequelize ORM
- JSON Web Tokens (JWT)
- Helmet, CORS, and Morgan for security and observability

## Getting Started

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Create a `.env` file** at the project root:

   ```env
   NODE_ENV=development
   PORT=3000
   JWT_SECRET=replace-with-secure-secret
   JWT_EXPIRES_IN=7d
   FRONTEND_URL=http://localhost:5173
   DB_HOST=localhost
   DB_PORT=6543
   DB_NAME=medical_records
   DB_USER=postgres
   DB_PASS=postgres
   ```

3. **Run database migrations and seeders**

   ```bash
   npm run db:migrate
   npm run db:seed
   ```

   The seeders provision demo users (admin, manager, staff, doctor, patient) and
   sample clinical data so you can interact with the API immediately.

4. **Start the development server**

   ```bash
   npm run dev
   ```

   The API will be available at `http://localhost:3000`. A health check endpoint
   is exposed at `/api/health`.

5. *(Optional)* **Run the Next.js front end**

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

   The app will start on [http://localhost:3001](http://localhost:3001) because
   the development script pins the Next.js server to port `3001`. Create
   `frontend/.env.local` with the following values so the development server
   proxies `/api/*` calls to the Express backend:

   ```ini
   NEXT_PUBLIC_API_BASE_URL=/api
   NEXT_PUBLIC_BACKEND_ORIGIN=http://localhost:3000
   ```

   Styling is implemented with Tailwind CSS, so the UI components rely on
   utility classes defined directly within the Next.js pages and components.

## API Overview

| Area            | Base Route              | Description                                                       |
| --------------- | ----------------------- | ----------------------------------------------------------------- |
| Authentication  | `/api/auth`             | Register, login (by email or username), password reset, and profile. |
| Admin Dashboard | `/api/admin`            | Role-managed analytics and user lifecycle management.             |
| Patients        | `/api/patients`         | CRUD for patient records, linked to user accounts when applicable.|
| Appointments    | `/api/appointments`     | CRUD for visit scheduling, status tracking, and clinician pairing.|
| Medical Records | `/api/medical-records`  | CRUD for encounter documentation, diagnoses, and treatment plans. |

### Roles & Permissions

- **Admin / Manager / Staff**: Full access to manage users, patients,
  appointments, and medical records.
- **Doctor**: Manage assigned patients, author medical records, and oversee
  appointments associated with their schedule.
- **Patient**: Maintain their own profile, book appointments, and view their
  clinical documentation.

### Sample Credentials

After seeding the database, you can use the following demo accounts:

| Role    | Email                   | Password     |
| ------- | ----------------------- | ------------ |
| Admin   | `admin@example.com`     | `password123`|
| Staff   | `staff@example.com`     | `password123`|
| Doctor  | `drsmith@example.com`   | `password123`|
| Patient | `patient@example.com`   | `password123`|

## Healthcare Impact

- **Improved accessibility**: Patients can review their own records and manage
  appointments, reducing the need for manual phone coordination.
- **Enhanced care coordination**: Doctors and staff share a unified record of
  encounters, assigned patients, and scheduled visits.
- **Operational insight**: Administrators gain immediate visibility into user
  roles, patient volumes, and upcoming visits, enabling data-driven planning.

## Development Scripts

- `npm run dev` – start the API with `nodemon` for local development.
- `npm start` – start the API in production mode.
- `npm run db:migrate` – run all pending migrations.
- `npm run db:seed` – populate the database with demo data.
- `npm run db:reset` – drop, recreate, migrate, and reseed the database.
- `npm --prefix frontend run dev` – start the Next.js application.
- `npm --prefix frontend run build` – create a production build of the front end.

## Testing the API

Use your preferred REST client (e.g., Thunder Client, Postman, or curl) to
invoke endpoints. Remember to include the `Authorization: Bearer <token>` header
for protected routes after authenticating via `/api/auth/login`. You may supply
either an email or a username along with the password when logging in.

## Next.js Frontend Overview

- **Pages**: Dedicated screens for login, registration, password recovery, password reset, and a patient dashboard that greets the user and surfaces basic account/profile data.
- **Auth context**: Lightweight React context handles JWT storage in `localStorage`, redirects between login and dashboard, and exposes a logout helper for the header.
- **API helper**: A small wrapper around `fetch` automatically prepends
  `NEXT_PUBLIC_API_BASE_URL` (default `/api`) so calls flow through the Next.js
  rewrite and reach the Express server, then injects the bearer token when
  present.
- **Styling**: Tailwind CSS provides utility-first styling across pages, enabling rapid iteration on layouts and future components.

### Password reset flow

The password recovery feature is split across two API endpoints and a pair of Next.js
pages. The underlying data is stored in the `PasswordResetToken` table, where tokens
are saved as bcrypt hashes along with an expiry timestamp, so even if the database
is compromised attackers cannot reuse the plain token values.

1. **Request a reset (`POST /api/auth/forgot-password`)**
   - **Input** – Send a JSON body containing either an `email` or `username` (or both).
   - **Processing** – The controller:
     1. Looks up the user by whichever identifier is present using a case-insensitive
        match.
     2. Removes any still-valid tokens for that account to ensure only one reset
        link can be active at a time.
     3. Generates a cryptographically random token, hashes it with bcrypt, and saves
        it alongside an expiration time (1 hour ahead) and the requester’s IP for
        auditability.
   - **Response** – Returns HTTP 200 with a neutral message plus the plain token and
     expiry timestamp in development builds so you can test without an email service:
     ```json
     {
       "success": true,
       "message": "If an account exists for that email or username, a reset link has been issued.",
       "data": {
         "token": "abcdef123456...",
         "expiresAt": "2025-01-01T12:34:56.000Z"
       }
     }
     ```
     In production you would remove the token from the response and instead send an
     email containing a link to the reset screen.

2. **Apply the reset (`POST /api/auth/reset-password`)**
   - **Input** – Provide the `token` from step 1 and a `newPassword`.
   - **Processing** – The server loads the hashed token for the matching user, checks
     that it has not expired or been used, and compares it with bcrypt. Once verified
     it rehashes the new password via the User model hook, marks all reset tokens for
     the user as `used`, and logs the completion.
   - **Response** – Returns HTTP 200 with a success message. Any invalid, expired, or
     previously consumed token triggers a 400/404 with an explanatory error payload.

3. **Front-end experience**
   - `/forgot-password` collects the identifier, calls the API, and surfaces the demo
     token/expiry so you can copy them during development.
   - `/reset-password` prompts for the token and new password. After a successful
     reset, the app redirects to `/login` so the user can sign in with their updated
     credentials.

Because tokens are hashed and single-use, users can safely request multiple resets in
quick succession without risking replay attacks, and stale tokens cannot be reused.
