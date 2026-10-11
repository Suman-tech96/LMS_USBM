# Learning Management System (LMS) - Production Backend

A complete, robust, secure, and production-ready Learning Management System (LMS) backend built using Node.js, Express, MongoDB, and Mongoose adhering strictly to MVC (Model-View-Controller) architecture.

---

## 🚀 Features & Architecture

- **Clean MVC Architecture**: Strict separation of concerns (Models, Views/Responses, Controllers, Routes, Services, Middlewares, Validators).
- **Authentication & Security**:
  - JWT-based authentication for Administrators and Students.
  - Password hashing via `bcryptjs`.
  - Rate limiting on authentication endpoints (`express-rate-limit`).
  - Security headers via `helmet` and CORS protection.
  - Cryptographically secure single-use password reset tokens (`crypto`).
  - Prevention against account enumeration, mass assignment, and NoSQL injection.
- **Admin Dashboard & Analytics**:
  - MongoDB aggregation pipelines in `services/dashboardService.js`.
  - Student enrollment metrics (active/inactive/total).
  - Course, batch, and study material distribution.
  - Examination status workflows (upcoming, ongoing, completed, cancelled).
  - Student participation analytics and pass/fail distribution.
- **Student & Course Management**:
  - CRUD operations with strict field allowlisting and schema validation.
  - Course and batch mapping, category filtering, search, pagination, and sorting.
  - Safe soft deletion preserving historical exam and result records.
- **Study Materials Management**:
  - Secure file uploads (PDFs, Images) using `multer` with file type validation and size limits.
  - Association of study materials to courses.
- **Examinations & Online Evaluation**:
  - Scheduled start/end windows, time limits, passing scores, and question marks configuration.
  - Anti-cheating: Student exam endpoints strip answer keys and explanations.
  - Atomic attempt tracking with maximum attempt enforcement.
  - **Server-side trusted evaluation**: Student scores and percentages are computed strictly on the backend.
- **Result Publication Control**:
  - Result workflow with `published` / `unpublished` states.
  - Students can only view their own *published* results.

---

## 📁 Directory Structure

```text
Backend/
├── config/
│   ├── db.js                 # Database connection & graceful disconnect
│   └── env.js                # Environment variable loader & validator
├── controllers/
│   ├── authController.js     # Admin & Student authentication, forgot/reset password
│   ├── courseController.js   # Course management & study material/exam mapping
│   ├── dashboardController.js# Admin dashboard statistics endpoints
│   ├── examinationController.js # Exam scheduling, questions & student test taking
│   ├── resultController.js   # Results list, detail, publish/unpublish workflow
│   ├── studentController.js  # Student CRUD, status & batch assignment
│   └── studyMaterialController.js # Study material upload & management
├── middlewares/
│   ├── authMiddleware.js     # Admin, Student & generic JWT authentication guards
│   ├── errorMiddleware.js    # Centralized error handler (CastError, duplicate key, validation)
│   ├── notFoundMiddleware.js # 404 Route handler
│   ├── rateLimitMiddleware.js# Rate limiting for auth & API endpoints
│   ├── uploadMiddleware.js   # Multer file upload configuration & file validation
│   └── validateRequest.js    # express-validator result formatter
├── models/
│   ├── Admin.js              # Admin schema with bcrypt hashing & crypto reset tokens
│   ├── Course.js             # Course schema with batches & associations
│   ├── Examination.js        # Exam schema with question bank & scheduling
│   ├── ExamParticipation.js  # Student attempt & answer submissions
│   ├── Result.js             # Computed results & publication status
│   ├── Student.js            # Student profile, course/batch & credentials
│   └── StudyMaterial.js      # Study material metadata & file paths
├── routes/
│   ├── authRoutes.js         # /api/v1/auth
│   ├── courseRoutes.js       # /api/v1/courses
│   ├── dashboardRoutes.js    # /api/v1/dashboard
│   ├── examinationRoutes.js  # /api/v1/examinations & /api/v1/student/examinations
│   ├── index.js              # Main API v1 router
│   ├── resultRoutes.js       # /api/v1/results & /api/v1/student/results
│   ├── studentRoutes.js      # /api/v1/students
│   └── studyMaterialRoutes.js# /api/v1/study-materials
├── scripts/
│   ├── seedAdmin.js          # Idempotent initial admin account seeder
│   └── changeAdminCredentials.js # Secure admin credential change script
├── services/
│   ├── dashboardService.js   # Aggregation queries for dashboard metrics
│   ├── emailService.js       # Nodemailer integration for password resets
│   ├── examinationService.js # Eligibility checking & exam grading engine
│   ├── passwordService.js    # Password hashing and strength validation
│   └── resultService.js      # Result publication service
├── tests/
│   ├── auth.test.js          # Auth endpoint test suite
│   ├── course.test.js        # Course management test suite
│   ├── dashboard.test.js     # Dashboard metrics test suite
│   ├── examination.test.js   # Examination & test participation test suite
│   ├── result.test.js        # Results & publication visibility test suite
│   ├── setup.js              # Test database setup & teardown
│   └── student.test.js       # Student management test suite
├── utils/
│   ├── ApiError.js           # Standardized error response class
│   ├── ApiResponse.js        # Standardized success response class
│   ├── asyncHandler.js       # Async controller wrapper
│   └── generateToken.js      # JWT token generator and validator
├── uploads/                  # Uploaded study materials storage
├── .env.example              # Template configuration
├── .gitignore
├── app.js                    # Express application configuration
├── package.json
└── server.js                 # Server entry point
```

---

## 🛠️ Prerequisites & Installation

- **Node.js**: `v18.x` or higher (`v22.x` recommended)
- **MongoDB**: `v6.x` or higher (running locally or MongoDB Atlas)

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

| Variable | Description | Example |
| :--- | :--- | :--- |
| `PORT` | Server HTTP port | `5000` |
| `NODE_ENV` | Environment mode | `development` / `production` |
| `MONGO_URI` | MongoDB Connection URI | `mongodb://127.0.0.1:27017/lms_db` |
| `MONGO_TEST_URI` | Dedicated Test Database URI | `mongodb://127.0.0.1:27017/lms_test_db` |
| `JWT_SECRET` | Secret key for signing JWTs | `your_long_random_jwt_secret_key` |
| `JWT_EXPIRES_IN` | Token validity | `7d` |
| `SEED_ADMIN_NAME` | Initial Admin display name | `Super Admin` |
| `SEED_ADMIN_EMAIL` | Initial Admin email | `admin@lms.com` |
| `SEED_ADMIN_PASSWORD` | Initial Admin password | `Admin@123456` |
| `ADMIN_RECOVERY_KEY` | Master recovery key for admin credential updates | `secure_admin_recovery_key` |
| `SMTP_HOST` | Nodemailer SMTP host | `smtp.mailtrap.io` |
| `SMTP_PORT` | SMTP port | `2525` |
| `SMTP_USER` | SMTP Username | `your_smtp_user` |
| `SMTP_PASS` | SMTP Password | `your_smtp_pass` |
| `MAX_FILE_SIZE_MB` | Upload file limit | `15` |

---

## 🔑 Administrative Operations

### Seed Initial Administrator Account

Run the idempotent seeding script. If an administrator already exists, it will not overwrite existing credentials:

```bash
npm run seed:admin
```

### Securely Change Administrator Credentials

Change an administrator's email or password using either their current password or the master `ADMIN_RECOVERY_KEY`:

```bash
# Using recovery key
ADMIN_RECOVERY_KEY_INPUT=secure_admin_recovery_key TARGET_ADMIN_EMAIL=admin@lms.com NEW_PASSWORD=NewAdmin@123456 npm run admin:change

# Using current password
TARGET_ADMIN_EMAIL=admin@lms.com CURRENT_PASSWORD=Admin@123456 NEW_PASSWORD=NewAdmin@123456 npm run admin:change
```

---

## 🏃 Running the Application

### Development Mode (with hot reload via Nodemon)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

---

## 🧪 Running Automated Tests

Run the full automated test suite (using Vitest and Supertest against a dedicated test database):

```bash
npm test
```

---

## 📡 Complete API Reference (`/api/v1`)

### 1. Authentication (`/api/v1/auth`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/login` | Public | Admin login |
| `POST` | `/auth/student/register` | Public | Student self-registration (auto-generates & returns student registration ID) |
| `POST` | `/auth/student/login` | Public | Student login with Email OR Student / Registration ID + Password |
| `POST` | `/auth/forgot-password`| Public | Request password reset token email |
| `POST` | `/auth/reset-password/:token` | Public | Reset password with token |
| `GET` | `/auth/me` | Authenticated | Get profile of logged-in admin/student |

#### Sample Admin Login Request
`POST /api/v1/auth/login`
```json
{
  "email": "admin@lms.com",
  "password": "Admin@123456"
}
```

#### Sample Success Response
```json
{
  "success": true,
  "message": "Admin logged in successfully",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "admin": {
      "id": "670689b25f498305f63dd780",
      "name": "Super Admin",
      "email": "admin@lms.com",
      "role": "admin"
    }
  }
}
```

---

### 2. Admin Dashboard (`/api/v1/dashboard`)

*All dashboard routes require `Authorization: Bearer <ADMIN_JWT>`*

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/dashboard/overview` | Total students (active/inactive), study materials, courses, exams, results |
| `GET` | `/dashboard/study-materials` | Materials breakdown by file type and storage |
| `GET` | `/dashboard/courses` | Course summary & student enrollment distribution |
| `GET` | `/dashboard/examinations` | Summary of all scheduled examinations |
| `GET` | `/dashboard/examinations/status`| Exam counts grouped by status (`draft`, `scheduled`, `ongoing`, etc.) |
| `GET` | `/dashboard/examination-statistics` | Pass rates, attempt counts, and average scores |
| `GET` | `/dashboard/results/status` | Published vs unpublished results breakdown |

---

### 3. Student Management (`/api/v1/students`)

*Admin Only*

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/students` | Create new student profile |
| `GET` | `/students` | Search, filter (status, course, batch), paginate, and sort |
| `GET` | `/students/:id` | Get single student details |
| `PATCH` | `/students/:id` | Update student profile |
| `PATCH` | `/students/:id/status` | Activate / deactivate student account (`active`, `inactive`, `suspended`) |
| `PATCH` | `/students/:id/course-batch`| Update course and batch assignment |
| `GET` | `/students/:id/examinations`| View student exam participation history |
| `GET` | `/students/:id/results` | View student results |
| `DELETE` | `/students/:id` | Soft delete student |

---

### 4. Course Management (`/api/v1/courses`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/courses` | Admin | Create course |
| `GET` | `/courses` | Admin / Student | List courses with pagination, search, filter |
| `GET` | `/courses/:id` | Admin / Student | Course detail with study materials & exams |
| `PATCH` | `/courses/:id` | Admin | Update course metadata & batches |
| `PATCH` | `/courses/:id/status` | Admin | Update status (`active`/`inactive`) |
| `PUT` | `/courses/:id/study-materials`| Admin | Map study materials array to course |
| `PUT` | `/courses/:id/examinations` | Admin | Map examinations array to course |
| `DELETE` | `/courses/:id` | Admin | Soft delete course |

---

### 5. Study Material Management (`/api/v1/study-materials`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/study-materials` | Admin | Upload file (`multipart/form-data`) or provide URL |
| `GET` | `/study-materials` | Admin / Student | Search & filter study materials |
| `GET` | `/study-materials/:id` | Admin / Student | Get study material by ID |
| `PATCH` | `/study-materials/:id` | Admin | Update title, description, category |
| `PATCH` | `/study-materials/:id/status`| Admin | Toggle status |
| `DELETE` | `/study-materials/:id` | Admin | Soft delete study material |

---

### 6. Examination Management & Participation (`/api/v1/examinations` & `/api/v1/student/examinations`)

#### Admin Endpoints (`/api/v1/examinations`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/examinations` | Admin | Create exam with question bank, marks & schedule |
| `GET` | `/examinations` | Admin | List exams with filters and pagination |
| `GET` | `/examinations/:id` | Admin | Full exam details including correct answer keys |
| `PATCH` | `/examinations/:id` | Admin | Update exam configuration |
| `PATCH` | `/examinations/:id/status` | Admin | Update status (`scheduled`, `ongoing`, `completed`) |
| `DELETE` | `/examinations/:id` | Admin | Soft delete examination |

#### Student Examination Workflow (`/api/v1/student/examinations`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/student/examinations` | Student | List eligible examinations for student's course & batch |
| `GET` | `/student/examinations/:id` | Student | Exam view (strips answer keys & explanations) |
| `POST` | `/student/examinations/:id/start` | Student | Start attempt (checks schedule window & attempts) |
| `POST` | `/student/examinations/:id/submit`| Student | Submit answers; server computes grade & creates Result |
| `GET` | `/student/examinations/:id/attempt`| Student | Check status of active attempt |

---

### 7. Result Management (`/api/v1/results` & `/api/v1/student/results`)

#### Admin Endpoints (`/api/v1/results`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/results` | Admin | List all exam results with filters |
| `GET` | `/results/:id` | Admin | View detailed result breakdown |
| `POST` | `/results/:id/publish` | Admin | Release result to student |
| `POST` | `/results/:id/unpublish` | Admin | Retract result from student view |

#### Student Endpoints (`/api/v1/student/results`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/student/results` | Student | List only published results for logged-in student |
| `GET` | `/student/results/:id` | Student | View single published result |

---

## 🔒 Security Best Practices Implemented

1. **Mass Assignment Protection**: Only validated, explicit fields are assigned during updates.
2. **Timing-Safe & Generic Errors**: `forgotPassword` always returns identical success messages to prevent account enumeration.
3. **Server-Side Scoring Integrity**: All question marks and answer comparisons happen on the server; client-submitted marks are rejected.
4. **No Sensitive Leaks**: Password hashes and reset tokens are excluded (`select: false`) by default and never returned in API payloads.
5. **Soft Deletion Integrity**: Cascade-safe soft deletion (`isDeleted: true`) prevents orphaned records and preserves academic transcripts.

---

## 📜 License
ISC
