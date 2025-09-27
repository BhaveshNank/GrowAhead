# GrowAhead - Micro-Investment Educational Platform

A full-stack fintech simulation platform that teaches investment concepts through automated round-up calculations and portfolio projections. Users can explore different investment strategies and understand the power of compound growth through an interactive, educational interface.

## Live Demo

**Frontend:** [https://growahead-beta.vercel.app](https://growahead-beta.vercel.app)  
**Backend API:** [https://growahead-backend.onrender.com](https://growahead-backend.onrender.com)

## How It Works

GrowAhead simulates the concept of micro-investing by:

1. **Transaction Processing**: Users can manually add transactions or upload CSV files containing their spending data
2. **Round-Up Calculations**: The platform automatically calculates "spare change" by rounding up each transaction to the nearest dollar
3. **Investment Simulation**: Round-ups are virtually "invested" using one of three risk profiles:
   - Conservative (5% annual return)
   - Balanced (8% annual return) 
   - Aggressive (12% annual return)
4. **Portfolio Projections**: Interactive dashboards show potential growth over 1, 3, 5, and 10-year periods using compound interest calculations
5. **Educational Analytics**: Users can compare different investment strategies and understand how consistent small investments can build substantial wealth over time

## Key Features

- **User Authentication**: Secure registration with email verification
- **Transaction Management**: Add, edit, delete, and bulk import transactions via CSV
- **Real-time Dashboards**: Interactive charts and visualizations using Recharts
- **Financial Projections**: Time-weighted calculations with precision arithmetic
- **Investment Strategy Comparison**: Side-by-side analysis of different risk profiles
- **Mobile-Responsive Design**: Optimized for all device types

## Tech Stack

**Frontend:**
- Next.js 15 with TypeScript
- TailwindCSS for styling
- Zustand for state management
- Recharts for data visualization

**Backend:**
- Node.js with Express.js
- PostgreSQL database
- JWT authentication with email verification
- Input validation with Joi
- Rate limiting and security middleware

**Deployment:**
- Frontend: Vercel
- Backend: Render (primary) & AWS Elastic Beanstalk
- Database: PostgreSQL on Render & AWS RDS

## API Endpoints

The backend provides RESTful API endpoints for:
- User authentication (`/api/auth`)
- Transaction management (`/api/transactions`)
- Wallet operations (`/api/wallet`)
- Investment projections (`/api/projections`)

## Installation & Setup

### Prerequisites
- Node.js (v18+)
- PostgreSQL database
- SendGrid API key for email services

### Backend Setup
```bash
cd Backend
npm install
cp .env.example .env
# Configure environment variables
npm start

