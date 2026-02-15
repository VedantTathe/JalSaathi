# JalSaathi Frontend

A modern React.js application for the JalSaathi water delivery management platform.

## Features

- **Multi-Role Support**: Customer, Provider, Delivery Personnel, and Admin dashboards
- **Real-time Order Tracking**: Live order status updates and delivery tracking
- **Provider Management**: Complete provider onboarding and approval workflow
- **Responsive Design**: Mobile-first design with Tailwind CSS
- **Authentication**: JWT-based authentication with role-based access control
- **Order Management**: Complete order lifecycle management
- **Analytics Dashboard**: Performance metrics and insights

## Tech Stack

- **Frontend**: React 18, React Router, React Query
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Form Handling**: React Hook Form
- **State Management**: React Context API
- **HTTP Client**: Axios
- **Notifications**: React Hot Toast

## Getting Started

### Prerequisites

- Node.js 16 or higher
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd JalSaathi/frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory:
   ```bash
   REACT_APP_API_URL=http://localhost:5000/api
   REACT_APP_APP_NAME=JalSaathi
   REACT_APP_VERSION=1.0.0
   ```

4. **Start development server**
   ```bash
   npm start
   # or
   yarn start
   ```

   The application will be available at `http://localhost:3000`

### Build for Production

```bash
npm run build
# or
yarn build
```

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── DashboardLayout.js
│   ├── LoadingSpinner.js
│   └── ProtectedRoute.js
├── contexts/           # React Context providers
│   └── AuthContext.js
├── pages/              # Page components
│   ├── auth/          # Authentication pages
│   ├── dashboards/    # Role-specific dashboards
│   ├── About.js
│   ├── Contact.js
│   ├── Orders.js
│   ├── OrderDetails.js
│   ├── Profile.js
│   └── TrackOrder.js
├── services/          # API services
│   └── api.js
├── utils/             # Utility functions
│   └── helpers.js
├── styles/            # CSS files
│   └── globals.css
└── App.js            # Main application component
```

## Available Scripts

- `npm start` - Runs the development server
- `npm build` - Creates optimized production build
- `npm test` - Runs the test suite
- `npm run eject` - Ejects from Create React App (irreversible)

## User Roles & Features

### Customer
- Browse and select water providers
- Place and track orders
- Manage delivery addresses
- View order history
- Rate and review providers

### Provider  
- Manage business profile and pricing
- Accept/reject incoming orders
- Assign delivery personnel
- Track business analytics
- Manage delivery team

### Delivery Personnel
- View assigned deliveries
- Update delivery status
- Navigate to delivery locations
- Mark orders as delivered
- Track performance metrics

### Admin
- Approve/reject provider applications
- Monitor system-wide analytics
- Manage users and orders
- Generate reports
- System configuration

## API Integration

The frontend communicates with the backend API using Axios. All API calls are configured in `src/services/api.js` with proper error handling and authentication headers.

### Authentication Flow
1. User logs in through `/login` or `/register`
2. JWT token stored in localStorage
3. Token included in all API requests
4. Automatic redirect to login on token expiry

## Styling Guide

The application uses Tailwind CSS for styling with custom configurations:

- **Primary Colors**: Blue tones for main actions
- **Water Colors**: Blue-green tones for water-related elements  
- **Success/Error**: Standard green/red for status indicators
- **Responsive**: Mobile-first design approach

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Email: support@jalsaathi.com
- Phone: +91 1800-123-4567
- Documentation: [Link to docs]

---

Built with ❤️ for better water accessibility in India