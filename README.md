# Water Bills - Rent + Water Billing System

A comprehensive monorepo for managing rent and water billing with automated invoice generation, payment processing, and tenant management.

## 🏗️ Architecture

- **API**: Node.js + Express REST API with JWT authentication
- **Worker**: Background job processing with BullMQ for invoice generation
- **Frontend**: React + Tailwind CSS + shadcn/ui components
- **Database**: MongoDB with Mongoose ODM
- **Queue**: Redis + BullMQ for reliable job processing
- **Validation**: Zod schemas for type-safe validation

## 🚀 Quick Start

### Prerequisites

- Bun 1.0+ (recommended) or Node.js 18+
- MongoDB 6+
- Redis 6+

### 1. Install Dependencies

```bash
# Using Bun (recommended)
bun install

# Or using npm
npm install
npm run install:all
```

### 2. Environment Setup

Copy environment files and configure:

```bash
# API
cp apps/api/env.example apps/api/.env

# Worker  
cp apps/api/env.example apps/worker/.env

# Web
cp apps/web/.env.example apps/web/.env
```

**Required Environment Variables:**

```env
# Database
MONGODB_URI=mongodb://localhost:27017/waterbills

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key-here
JWT_REFRESH_SECRET=your-super-secret-refresh-key-here

# API
PORT=3001
CORS_ORIGIN=http://localhost:3000
```

### 3. Database Setup

```bash
# Start MongoDB and Redis
# Then seed the database
cd scripts
bun install
bun run seed.js
```

### 4. Start Development Servers

```bash
# Start all services
bun run dev

# Or start individually:
bun run dev:api      # API server on :3001
bun run dev:worker   # Background worker
bun run dev:web      # React app on :3000
```

## 📁 Project Structure

```
waterbills/
├── apps/
│   ├── api/                 # Express REST API
│   │   ├── controllers/     # Request handlers
│   │   ├── middleware/      # Auth, validation
│   │   ├── routes/          # API endpoints
│   │   ├── services/        # Business logic
│   │   └── server.js        # Main server file
│   ├── worker/              # Background job worker
│   │   ├── services/        # Billing service
│   │   └── worker.js        # Main worker file
│   └── web/                 # React frontend
│       ├── src/
│       │   ├── components/  # Reusable UI components
│       │   ├── pages/       # Page components
│       │   ├── contexts/    # React contexts
│       │   ├── services/    # API client
│       │   └── lib/         # Utilities
│       └── public/          # Static assets
├── packages/
│   ├── shared/              # Shared utilities & validation
│   ├── db/                  # Database models & schemas
│   └── ui/                  # Shared UI components
└── scripts/                 # Database scripts
    └── seed.js              # Sample data seeding
```

## 🔑 Test Accounts

After running the seed script, you can use these test accounts:

- **Admin**: `admin@waterbills.com` / `admin123`
- **Manager**: `manager@waterbills.com` / `manager123`  
- **Tenants**: `tenant1@waterbills.com` / `tenant123`

## 🎯 Key Features

### 💰 Billing System
- **Automated Invoice Generation**: Runs on 25th of each month
- **Water Usage Calculation**: Prorated based on submeter readings
- **Penalty Calculation**: Daily penalties for overdue payments
- **Receipt Generation**: Printable receipts for payments

### 🏢 Multi-Tenant Architecture
- **Role-Based Access**: Admin, Manager, Tenant roles
- **Building Management**: Multiple buildings support
- **Premise Management**: Individual unit tracking
- **Meter Management**: Council, borehole, and submeter tracking

### 📊 Reporting & Analytics
- **Water Consumption Reports**: Building and premise level
- **Revenue Reports**: Payment tracking and analytics
- **Invoice Status Tracking**: Real-time payment status
- **Audit Logging**: Complete audit trail

### 💳 Payment Processing
- **Multiple Payment Methods**: MPesa, Cash, Bank transfers
- **MPesa Integration**: STK Push and webhook support
- **Payment Reconciliation**: Automatic payment matching
- **Receipt Generation**: Professional receipt templates

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/refresh` - Token refresh
- `GET /api/auth/profile` - Get user profile

### Buildings & Premises
- `GET /api/buildings` - List buildings
- `POST /api/buildings` - Create building
- `GET /api/premises` - List premises
- `POST /api/premises` - Create premise

### Invoices & Payments
- `GET /api/invoices` - List invoices
- `POST /api/invoices/generate` - Generate invoices
- `POST /api/payments` - Process payment
- `GET /api/invoices/:id/receipt` - Get receipt

### Meters & Readings
- `GET /api/meters` - List meters
- `POST /api/readings` - Record meter reading
- `GET /api/readings` - List readings

## ⚙️ Background Jobs

The worker service handles:

1. **Invoice Generation** (25th monthly at 00:05)
   - Calculates water usage for all buildings
   - Generates invoices for next month
   - Includes rent + water charges

2. **Penalty Calculation** (Daily at midnight)
   - Recalculates penalties for overdue invoices
   - Updates invoice status

3. **Disconnect Evaluation** (Daily at 6 AM)
   - Identifies premises for disconnection
   - Creates disconnection tasks

## 🛠️ Development

### Adding New Features

1. **API Endpoints**: Add routes in `apps/api/routes/`
2. **Database Models**: Update schemas in `packages/db/`
3. **Frontend Pages**: Add components in `apps/web/src/pages/`
4. **Validation**: Update schemas in `packages/shared/`

### Database Migrations

```bash
# Create migration script
cd scripts
bun run your-migration.js
```

### Testing

```bash
# API tests
cd apps/api
bun test

# Frontend tests  
cd apps/web
bun test
```

## 🚀 Deployment

### Production Build

```bash
# Build all applications
bun run build

# Start production servers
bun start
```

### Docker Deployment

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d
```

### Environment Variables for Production

```env
NODE_ENV=production
MONGODB_URI=mongodb://your-mongo-cluster
REDIS_URL=redis://your-redis-cluster
JWT_SECRET=your-production-secret
CORS_ORIGIN=https://your-domain.com
```

## 📝 Business Logic

### Invoice Generation Process

1. **Water Usage Calculation**:
   - Get council and borehole meter readings
   - Calculate total building water bill
   - Distribute cost based on submeter usage

2. **Invoice Creation**:
   - Rent amount (full month)
   - Water amount (prorated)
   - Previous balance
   - Due date (8th of next month)

3. **Penalty Calculation**:
   - Daily penalty rate × days late
   - Applied to unpaid amounts only

### Water Billing Formula

```
Total Building Bill = (Council Units × Council Price) + 
                     (Borehole Units × Borehole Price) + 
                     Pumping Cost

Per Unit Rate = Total Building Bill ÷ Total Submeter Units

Premise Water Bill = Premise Submeter Units × Per Unit Rate
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the API endpoints

---

**Built with ❤️ for efficient property management**
