# Inventory Management System

A production-ready full-stack inventory management system with React frontend and Golang backend.

## Tech Stack

- **Frontend**: React + Vite + TailwindCSS
- **Backend**: Golang (Gin framework)
- **Database**: PostgreSQL
- **Auth**: JWT (access + refresh tokens)

## Project Structure

```
├── db/
│   └── schema.sql          # PostgreSQL database schema
├── server/                 # Golang backend
│   ├── main.go            # Entry point
│   └── ...
├── internal/
│   ├── database/          # DB connection & migrations
│   ├── handlers/          # API handlers
│   ├── middleware/        # JWT auth middleware
│   ├── models/            # GORM models
│   └── utils/             # Auth utilities
├── config/                 # Configuration
├── bin/                   # Compiled binaries
├── .env                   # Environment variables
├── go.mod / go.sum        # Go dependencies
└── README.md
```

## Setup

### 1. Database Setup

Create a PostgreSQL database and run the schema:

```bash
psql -U postgres -c "CREATE DATABASE inventory;"
psql -U postgres -d inventory -f db/schema.sql
```

### 2. Backend Setup

```bash
# Install dependencies
go mod download

# Build
go build -o bin/server.exe ./server

# Run
./bin/server.exe
```

The server will start on `http://localhost:8080`

### 3. Environment Variables

Edit `.env` file:
```
PORT=8080
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=inventory
JWT_SECRET=your-super-secret-key
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/refresh` - Refresh token
- `GET /api/v1/auth/me` - Get current user (protected)

### Resources (protected)
- `/api/v1/users` - User CRUD
- `/api/v1/categories` - Category CRUD
- `/api/v1/products` - Product CRUD
- `/api/v1/suppliers` - Supplier CRUD
- `/api/v1/warehouses` - Warehouse CRUD
- `/api/v1/inventory` - Inventory CRUD

### Stock Management (protected)
- `GET /api/v1/stock/transactions` - List transactions
- `POST /api/v1/stock/in` - Stock in
- `POST /api/v1/stock/out` - Stock out
- `POST /api/v1/stock/transfer` - Transfer between warehouses
- `POST /api/v1/stock/adjustment` - Adjust stock

### RBAC (protected)
- `/api/v1/roles` - Role CRUD
- `/api/v1/permissions` - List permissions
- `/api/v1/user-roles` - Assign/remove roles

### Dashboard (protected)
- `GET /api/v1/dashboard/stats` - Dashboard statistics
- `GET /api/v1/dashboard/charts/sales` - Sales chart data
- `GET /api/v1/dashboard/charts/stock` - Stock distribution

## Default Login

After running the schema, a default admin user is created:
- Email: `admin@inventory.com`
- Password: `Admin@123`

## Running the Backend

```bash
# Development
go run ./server

# Or run the compiled binary
./bin/server.exe
```

# Inventory Management System

A production-ready full-stack inventory management system with React frontend and Golang backend.

## Tech Stack

- **Frontend**: React + Vite + TailwindCSS
- **Backend**: Golang (Gin framework)
- **Database**: PostgreSQL
- **Auth**: JWT (access + refresh tokens)

## Project Structure

```
├── db/
│   └── schema.sql          # PostgreSQL database schema
├── server/                 # Golang backend
│   ├── main.go            # Entry point
│   └── ...
├── internal/
│   ├── database/          # DB connection & migrations
│   ├── handlers/          # API handlers
│   ├── middleware/        # JWT auth middleware
│   ├── models/            # GORM models
│   └── utils/             # Auth utilities
├── config/                 # Configuration
├── bin/                   # Compiled binaries
├── .env                   # Environment variables
├── go.mod / go.sum        # Go dependencies
└── README.md
```

## Setup

### 1. Database Setup

Create a PostgreSQL database and run the schema:

```bash
psql -U postgres -c "CREATE DATABASE inventory;"
psql -U postgres -d inventory -f db/schema.sql
```

### 2. Backend Setup

```bash
# Install dependencies
go mod download

# Build
go build -o bin/server.exe ./server

# Run
./bin/server.exe
```

The server will start on `http://localhost:8080`

### 3. Environment Variables

Edit `.env` file:
```
PORT=8080
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=inventory
JWT_SECRET=your-super-secret-key
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/refresh` - Refresh token
- `GET /api/v1/auth/me` - Get current user (protected)

### Resources (protected)
- `/api/v1/users` - User CRUD
- `/api/v1/categories` - Category CRUD
- `/api/v1/products` - Product CRUD
- `/api/v1/suppliers` - Supplier CRUD
- `/api/v1/warehouses` - Warehouse CRUD
- `/api/v1/inventory` - Inventory CRUD

### Stock Management (protected)
- `GET /api/v1/stock/transactions` - List transactions
- `POST /api/v1/stock/in` - Stock in
- `POST /api/v1/stock/out` - Stock out
- `POST /api/v1/stock/transfer` - Transfer between warehouses
- `POST /api/v1/stock/adjustment` - Adjust stock

### RBAC (protected)
- `/api/v1/roles` - Role CRUD
- `/api/v1/permissions` - List permissions
- `/api/v1/user-roles` - Assign/remove roles

### Dashboard (protected)
- `GET /api/v1/dashboard/stats` - Dashboard statistics
- `GET /api/v1/dashboard/charts/sales` - Sales chart data
- `GET /api/v1/dashboard/charts/stock` - Stock distribution

## Default Login

After running the schema, a default admin user is created:
- Email: `admin@inventory.com`
- Password: `Admin@123`

## Running the Backend

```bash
# Development
go run ./server

# Or run the compiled binary
./bin/server.exe
```