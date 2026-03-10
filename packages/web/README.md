# HRMS Frontend

Modern React 18 application for Human Resource Management System with Material-UI, Redux Toolkit, and TypeScript.

## Features

- **Authentication**: JWT-based login with Multi-Factor Authentication (TOTP)
- **Employee Management**: Search, filter, and view employee details with organizational hierarchy
- **Time & Attendance**: Clock in/out system with timesheet history
- **Leave Management**: Request leave, track balance, approval workflow
- **Payroll**: View pay stubs and salary details
- **Responsive Design**: Mobile-friendly UI with Material-UI components
- **State Management**: Redux Toolkit for predictable state updates
- **Protected Routes**: Secure page access with authentication guards

## Tech Stack

- **React 18**: Modern UI library
- **TypeScript**: Type-safe JavaScript
- **Material-UI (MUI)**: Component library
- **Redux Toolkit**: State management
- **React Router DOM**: Client-side routing
- **Axios**: HTTP client with interceptors
- **Date-fns**: Date utilities

## Project Structure

```
src/
├── components/          # Reusable React components
│   ├── Layout.tsx       # Main layout with sidebar navigation
│   ├── ProtectedRoute.tsx # Route protection component
│   ├── ErrorBoundary.tsx  # Error handling
│   └── LoadingSpinner.tsx # Loading indicator
├── pages/              # Page components
│   ├── LoginPage.tsx
│   ├── VerifyMFAPage.tsx
│   ├── DashboardPage.tsx
│   ├── EmployeeListPage.tsx
│   ├── TimeAttendancePage.tsx
│   ├── LeaveManagementPage.tsx
│   └── PayrollPage.tsx
├── services/           # API service layer
│   ├── apiClient.ts    # Axios instance with interceptors
│   ├── authService.ts  # Authentication APIs
│   ├── employeeService.ts # Employee APIs
│   └── hrService.ts    # HR module APIs
├── store/              # Redux store configuration
│   ├── authSlice.ts    # Authentication state
│   ├── employeeSlice.ts # Employee state
│   └── index.ts        # Store configuration
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
└── App.tsx             # Main application component
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file with API configuration:
```bash
cp .env.example .env
```

3. Update API URL if needed:
```env
REACT_APP_API_URL=http://localhost:3001/api/v1
REACT_APP_ENV=development
```

### Running the Application

Development mode with hot reload:
```bash
npm start
```

The app will open at `http://localhost:3000`

### Building for Production

```bash
npm run build
```

This creates an optimized production build in the `build` directory.

## Available Routes

### Public Routes
- `/login` - Login page
- `/verify-mfa` - MFA verification page

### Protected Routes (requires authentication)
- `/` - Redirect to dashboard
- `/dashboard` - Main dashboard with quick stats
- `/employees` - Employee directory with search
- `/time` - Time & Attendance (clock in/out)
- `/leave` - Leave management (request & balance)
- `/payroll` - Payroll (pay stubs)

## Authentication Flow

1. **Login**
   - Enter email and password on `/login`
   - If credentials are valid and MFA is not enabled, user is logged in
   - If MFA is enabled, user is redirected to `/verify-mfa`

2. **MFA Verification**
   - User enters 6-digit code from authenticator app
   - Upon verification, tokens are stored in localStorage
   - User is redirected to `/dashboard`

3. **Token Management**
   - Access token stored in `localStorage` as `access_token`
   - Refresh token stored in `localStorage` as `refresh_token`
   - Interceptors automatically attach token to requests
   - On 401 response, tokens are cleared and user redirected to login

## API Integration

### Service Layer
All API calls are abstracted in the `services/` directory:

```typescript
// Example: Get employees
import { EmployeeService } from '@services/employeeService';

const employees = await EmployeeService.getAll();
```

### Request Interceptor
Automatically adds authorization header:
```typescript
Authorization: Bearer {access_token}
```

### Error Handling
- 401 responses trigger automatic logout
- Errors are propagated to components for handling
- Use try-catch blocks in components

## State Management

### Redux Store Structure

```typescript
{
  auth: {
    user: User | null,
    isAuthenticated: boolean,
    loading: boolean,
    error: string | null,
    mfaRequired: boolean,
    sessionId: string | null,
  },
  employees: {
    employees: Employee[],
    selectedEmployee: Employee | null,
    loading: boolean,
    error: string | null,
    total: number,
    page: number,
    limit: number,
  },
}
```

### Dispatching Actions

```typescript
import { useDispatch } from 'react-redux';
import { setUser, setLoading } from '@store/authSlice';

const dispatch = useDispatch<AppDispatch>();
dispatch(setUser(user));
dispatch(setLoading(true));
```

## Styling

Material-UI theme configuration in `index.tsx`:
- Primary color: #1976d2
- Secondary color: #dc004e
- Uses Roboto font family

Customize theme in:
```typescript
const theme = createTheme({
  palette: { /* ... */ },
  typography: { /* ... */ },
});
```

## Testing

For UI component testing and E2E tests:
```bash
npm test                  # Run unit tests
npm run build            # Build for testing
```

## Common Tasks

### Adding a New Page

1. Create component in `src/pages/NewPage.tsx`
2. Add route in `src/App.tsx`:
```typescript
<Route path="new-page" element={<NewPage />} />
```
3. Add navigation link in `src/components/Layout.tsx`

### Adding API Integration

1. Create service in `src/services/newService.ts`
2. Define interfaces in `src/types/new.ts`
3. Use service in components:
```typescript
const data = await NewService.getData();
```

### Managing State

1. Create slice in `src/store/newSlice.ts` using Redux Toolkit
2. Add to store in `src/store/index.ts`
3. Use in components with `useSelector` and `useDispatch`

## Environment Variables

- `REACT_APP_API_URL` - Backend API URL (default: http://localhost:3001/api/v1)
- `REACT_APP_ENV` - Environment type (development/production)

## Performance Optimization

- Code splitting with React Router
- Lazy loading components
- Redux selectors for memo optimization
- API response caching where applicable

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Troubleshooting

### API Connection Issues
- Check `REACT_APP_API_URL` in `.env`
- Ensure backend server is running on specified port
- Check browser console for CORS errors

### Authentication Issues
- Clear localStorage if tokens are corrupted
- Check MFA setup on backend
- Verify JWT expiration settings

### State Management Issues
- Use Redux DevTools extension to debug
- Check Redux Toolkit documentation
- Verify selectors in components

## Contributing

1. Create feature branch: `git checkout -b feature/name`
2. Follow existing code patterns
3. Test changes thoroughly
4. Submit pull request

## License

Proprietary - HRMS System

## Support

For issues and questions, contact the development team.
