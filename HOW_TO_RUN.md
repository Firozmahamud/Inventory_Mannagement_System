# Inventory Management System - How to Run

## Prerequisites

1. **Node.js** (v18+) - for frontend
2. **Go** (v1.21+) - for backend
3. **PostgreSQL** (v14+) - for database

---

## Step 1: Set Up Database

1. Install PostgreSQL and start the service
2. Create a new database:
   ```sql
   CREATE DATABASE inventory;
   ```
3. Run the schema:
   ```bash
   psql -U postgres -d inventory -f db/schema.sql
   ```

Or using pgAdmin/psql GUI:
- Import `db/schema.sql` into your `inventory` database

---

## Step 2: Configure Backend

1. Open `.env` file and update database credentials if needed:
   ```
   DB_HOST=localhost
   DB_PORT=5432
   DB_USER=postgres
   DB_PASSWORD=postgres
   DB_NAME=inventory
   JWT_SECRET=your-super-secret-key-change-in-production
   ```

2. Run the backend:
   ```bash
   # Option 1: Run the built binary
   ./bin/server.exe

   # Option 2: Run in development
   cd server
   go run main.go
   ```

   Backend will start on `http://localhost:8080`

---

## Step 3: Run Frontend

1. Navigate to frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies (if not installed):
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

   Frontend will start on `http://localhost:5173`

---

## Step 4: Access the Application

1. Open browser to `http://localhost:5173`
2. Login with default credentials:
   - **Email**: `admin@inventory.com`
   - **Password**: `Admin@123`

---

## Quick Start (All in One)

```bash
# 1. Database (manual setup required)
# - Install PostgreSQL
# - Create database "inventory"
# - Run: psql -U postgres -d inventory -f db/schema.sql

# 2. Start Backend
./bin/server.exe

# 3. Start Frontend (new terminal)
cd frontend
npm run dev
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/auth/login | Login |
| POST | /api/v1/auth/register | Register |
| POST | /api/v1/auth/refresh | Refresh token |
| GET | /api/v1/dashboard/stats | Dashboard stats |
| GET | /api/v1/products | List products |
| POST | /api/v1/products | Create product |
| GET | /api/v1/inventory | List inventory |
| POST | /api/v1/stock/in | Stock in |
| POST | /api/v1/stock/out | Stock out |
| POST | /api/v1/stock/transfer | Transfer stock |

---

## Project Structure

```
inventory-system/
├── db/schema.sql          # PostgreSQL schema
├── server/               # Go backend
├── bin/server.exe        # Compiled backend
├── frontend/             # React frontend
│   ├── src/pages/        # Page components
│   ├── src/components/  # UI components
│   └── dist/            # Production build
├── .env                  # Environment config
└── README.md            # Documentation
```

---

## Troubleshooting

**Backend won't start?**
- Check PostgreSQL is running
- Verify `.env` database credentials

**Frontend won't load?**
- Run `npm install` in frontend folder
- Check backend is running on port 8080

**Login fails?**
- Verify database schema was applied
- Check default admin user exists in `users` table

**Port already in use?**
- Backend: change PORT in `.env`
- Frontend: change port in `vite.config.js`