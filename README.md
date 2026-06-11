# HOC App - Hazard Observation Card System

A full-stack mobile application for hazard observation and reporting with 2-factor SMS OTP authentication.

## Tech Stack
- **Frontend:** React Native
- **Backend:** Express.js
- **Database:** MySQL
- **Authentication:** JWT + 2FA SMS OTP

## Features
- User/Admin login with 2FA SMS OTP
- User Dashboard
- HOC Report Creation with Image Upload
- Admin Variant Master (Locations, Areas, Status, Category)
- Admin Employee Master (Add/Edit/Delete employees)
- Role-based Access Control

## Project Structure
```
hoc_app/
├── backend/
│   ├── src/
│   │   ├── app.js
│   │   ├── config/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── utils/
│   │   └── models/
│   ├── .env
│   ├── .env.example
│   └── package.json
├── database/
│   └── schema.sql
└── README.md
```

## Getting Started

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file from `.env.example`:
```bash
cp .env.example .env
```

4. Update `.env` with your local MySQL credentials

5. Run database migrations:
```bash
mysql -u your_user -p your_password < ../database/schema.sql
```

6. Start the server:
```bash
npm run dev
```

## API Endpoints

### Authentication
- `POST /api/auth/request-otp` - Request OTP via SMS
- `POST /api/auth/verify-otp` - Verify OTP and get JWT token
- `POST /api/auth/logout` - Logout user

### Dashboard
- `GET /api/dashboard/user` - Get user dashboard data

### HOC Input (Reports)
- `GET /api/hoc-input` - Get all reports (paginated)
- `POST /api/hoc-input` - Create new report
- `GET /api/hoc-input/:id` - Get report by ID
- `PUT /api/hoc-input/:id` - Update report
- `DELETE /api/hoc-input/:id` - Delete report

### Variant Master (Admin)
- `GET /api/variant-master` - Get all variants
- `POST /api/variant-master` - Create variant
- `PUT /api/variant-master/:id` - Update variant
- `DELETE /api/variant-master/:id` - Delete variant

### Employee Master (Admin)
- `GET /api/employee-master` - Get all employees
- `POST /api/employee-master` - Add employee
- `PUT /api/employee-master/:id` - Update employee
- `DELETE /api/employee-master/:id` - Delete employee

## Environment Variables

```env
# Server
PORT=5000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=hoc_app

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE=24h

# Twilio (Add later)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# OTP Settings
OTP_EXPIRY=5
OTP_LENGTH=6
```

## Database Schema

The application uses the following main tables:
- `users` - User credentials and roles
- `hoc_input` - Hazard observation reports
- `variant_master` - Dropdown options (locations, areas, status, categories)
- `otp_verifications` - OTP tracking for 2FA

## Development

```bash
# Run in development mode with auto-reload
npm run dev

# Run tests
npm test
```

## Deployment

For production deployment:
1. Update `.env` with production database credentials
2. Set `NODE_ENV=production`
3. Use a process manager like PM2
4. Set up SSL/TLS certificates
5. Configure Twilio credentials for SMS OTP

## License

ISC
