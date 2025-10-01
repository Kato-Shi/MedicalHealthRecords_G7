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

## API Overview

| Area            | Base Route              | Description                                                       |
| --------------- | ----------------------- | ----------------------------------------------------------------- |
| Authentication  | `/api/auth`             | Register, login, and fetch the current user profile.              |
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

## Testing the API

Use your preferred REST client (e.g., Thunder Client, Postman, or curl) to
invoke endpoints. Remember to include the `Authorization: Bearer <token>` header
for protected routes after authenticating via `/api/auth/login`.
