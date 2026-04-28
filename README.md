# 💧 JalSaathi  
## Har Pyaas Ka Saathi  
### Area-Based Water Can Delivery Management System

JalSaathi is a centralized web platform that connects customers, local water suppliers, and delivery personnel within a specific area.

The system digitizes traditional water can delivery by providing structured order management, provider approval workflow, and real-time delivery updates.

---

# 🏗 Current Architecture (Modular Monolithic)

JalSaathi is currently built using a **Modular Monolithic Architecture**.

This means:

- Single backend application
- Feature-based modular structure
- Clear separation of concerns
- Easy maintainability
- Future-ready for microservices migration

Each module contains:
- Controller
- Service Layer
- Routes
- Model
- Validation Logic

## 📁 Backend Structure


src/
│
├── modules/
│ ├── auth/
│ ├── user/
│ ├── provider/
│ ├── order/
│ ├── delivery/
│ ├── admin/
│
├── middlewares/
├── config/
├── utils/
└── server.js




This approach ensures clean architecture while keeping deployment simple.

---

# 🚀 Deployment Overview

JalSaathi supports **dual deployment**: automatic to Vercel (on git push) or manual to AWS (on-demand).

## Quick Start

### Deploy to Vercel (Auto-Deploy)
```bash
git push origin main
# ✅ Automatically deploys both frontend + backend in 2-3 minutes
# 📍 Frontend: https://jalsaathived.vercel.app
```

### Deploy to AWS (Manual)
```bash
cd cdk
./deploy.ps1        # Windows
# OR
./deploy.sh         # Linux/Mac/WSL
# ✅ Deploys to Lambda + S3 in 10-15 minutes
```

## Deployment Documentation

| Document | Purpose |
|----------|---------|
| [QUICK_DEPLOY_REFERENCE.md](./QUICK_DEPLOY_REFERENCE.md) | Quick command reference |
| [DEPLOYMENT_SETUP_COMPLETE.md](./DEPLOYMENT_SETUP_COMPLETE.md) | Complete setup overview |
| [DEPLOYMENT_VERIFICATION_CHECKLIST.md](./DEPLOYMENT_VERIFICATION_CHECKLIST.md) | Step-by-step verification |
| [DEPLOYMENT_COMMANDS_REFERENCE.md](./DEPLOYMENT_COMMANDS_REFERENCE.md) | Expected outputs & troubleshooting |
| [cdk/README.md](./cdk/README.md) | AWS CDK infrastructure details |

**Start Here:** [QUICK_DEPLOY_REFERENCE.md](./QUICK_DEPLOY_REFERENCE.md) - Quick overview of both deployment paths.

---

# 📌 Problem Statement

In most areas, water delivery works through:

- Phone calls
- WhatsApp messages
- Manual record keeping
- No confirmation system
- No provider visibility control
- No centralized monitoring

This leads to:

- Missed deliveries
- Payment confusion
- Poor tracking
- No accountability
- No system transparency

---

# 🎯 Proposed Solution

JalSaathi provides:

- Customer ordering system
- Provider order acceptance system
- Delivery boy assignment
- Real-time status updates
- Provider online/offline visibility
- Centralized admin monitoring

---

# 👥 User Roles

## 1️⃣ Customer

Customers can:

- Create account
- Save delivery address
- Add special instructions
- View nearby providers
- See price per can
- Place order
- Make payment
- Receive delivery notification
- View order history

---

## 2️⃣ Provider (Water Supplier)

Each provider:

- Has one dedicated account
- Can toggle Online / Offline status
- Accepts or rejects orders
- Assigns delivery boys

Tracks:

- Pending orders
- Accepted orders
- Delivered orders
- Payment status
- Customer details

### Important Logic

- If Provider is OFFLINE → Customers cannot place orders.
- If Provider is ONLINE → Orders can be placed.

---

## 3️⃣ Delivery Boy

Each delivery boy is associated with only one provider.

Delivery boy can:

- Log into system
- View assigned orders
- Mark order as Delivered
- Update status in real time

When marked delivered:

- Customer gets notification
- Provider dashboard updates
- Order status changes to completed

---

## 4️⃣ Admin

Admin has full system access.

Admin can:

- View all providers
- View all customers
- View all orders
- Monitor delivery performance
- Activate / deactivate providers
- Access complete system data

---

# 🔄 Complete System Flow

1. Customer logs in.
2. Customer selects nearby provider.
3. Customer views price per can.
4. Customer places order.
5. Customer makes payment.
6. Provider receives order request.
7. Provider accepts order.
8. Provider assigns delivery boy.
9. Delivery boy delivers water.
10. Delivery boy marks "Delivered".
11. Customer receives confirmation notification.
12. Order status updates in provider and admin dashboards.

---

# ✨ Core Features

## Customer Side
- Account creation
- Address management
- Special delivery notes
- Nearby provider listing
- Transparent pricing
- Secure payment
- Delivery confirmation
- Order history

## Provider Side
- Online/Offline toggle
- Order acceptance system
- Delivery assignment
- Order tracking dashboard
- Revenue overview
- Customer details access

## Delivery Side
- Login system
- Assigned order list
- One-click delivery confirmation
- Real-time update system

## Admin Panel
- Full database visibility
- Provider management
- Order monitoring
- User management
- System analytics

---

# 🛠 Tech Stack

## Frontend
- React.js
- Tailwind CSS
- Axios
- React Router

## Backend
- Node.js
- Express.js
- Modular Monolithic Architecture

## Database
- MongoDB
- Mongoose

## Authentication
- JWT (Role-based login)
- bcrypt password encryption

---

# 🗄 Database Models Overview

## User Model
- Name
- Email
- Password
- Role (Customer / Provider / Delivery / Admin)
- Address
- Special Notes

## Provider Model
- Business Name
- Area
- Online Status
- Price Per Can
- Delivery Boys List

## Order Model
- Customer ID
- Provider ID
- Delivery Boy ID
- Status (Pending / Accepted / Delivered)
- Payment Status
- Timestamp

---

# 🔐 Security Design

- Role-based authorization
- Protected API routes
- Hashed passwords
- Token-based session management
- Controlled provider visibility

---

# 📈 Future Scope

The modular monolithic architecture allows seamless migration to:

- Microservices architecture
- Docker containerization
- Kubernetes orchestration
- Separate databases per service
- Redis caching
- Message queue integration
- CI/CD pipelines

Planned Enhancements:

- Subscription-based delivery
- GPS-based delivery tracking
- SMS notifications
- Multi-area scaling
- Mobile app integration
- Advanced analytics dashboard

---

# 🏁 Conclusion

JalSaathi — Har Pyaas Ka Saathi — creates a structured digital ecosystem for water can delivery by:

- Ensuring provider control
- Enabling delivery accountability
- Giving admin full visibility
- Providing customer transparency

It replaces unorganized manual systems with a scalable, efficient platform built using clean modular backend architecture principles and designed for future cloud-native transformation.

