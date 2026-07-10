# Neighborly Frontend - Detailed Implementation Plan

## Phase 1: Foundation Setup (Week 1)

### Day 1: Project Initialization

#### 1. Initialize React/TypeScript Project with Vite
```bash
npm create vite@latest neighborly-frontend -- --template react-ts
cd neighborly-frontend
npm install
```

#### 2. Install Core Dependencies
```bash
npm install react-router-dom @tanstack/react-query zustand axios
npm install react-hook-form @hookform/resolvers zod
npm install tailwindcss postcss autoprefixer @tailwindcss/forms
npm install @headlessui/react @heroicons/react
npm install date-fns react-datepicker
npm install socket.io-client mapbox-gl @mapbox/mapbox-gl-geocoder
npm install lucide-react
```

#### 3. Configure Tailwind CSS
```bash
npx tailwindcss init -p
```

```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
        },
        secondary: {
          500: '#10b981',
          600: '#059669',
        }
      },
      fontFamily: {
        sans: ['Inter var', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
```

#### 4. Project Structure
```
neighborly-frontend/
├── src/
│   ├── index.css
│   ├── main.tsx
│   ├── App.tsx
│   ├── App.css
│   ├── types/
│   │   ├── index.ts
│   │   ├── user.types.ts
│   │   ├── service.types.ts
│   │   └── booking.types.ts
│   ├── api/
│   │   ├── client.ts
│   │   ├── auth.api.ts
│   │   ├── users.api.ts
│   │   ├── services.api.ts
│   │   └── bookings.api.ts
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Card.tsx
│   │   │   └── Modal.tsx
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── Layout.tsx
│   │   └── auth/
│   │       ├── LoginForm.tsx
│   │       └── RegisterForm.tsx
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useServices.ts
│   │   └── useBooking.ts
│   ├── pages/
│   │   ├── Home.tsx
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   ├── Services.tsx
│   │   └── Profile.tsx
│   ├── store/
│   │   ├── auth.store.ts
│   │   ├── ui.store.ts
│   │   └── index.ts
│   ├── utils/
│   │   ├── constants.ts
│   │   ├── formatters.ts
│   │   └── validators.ts
│   └── context/
│       ├── AuthContext.tsx
│       └── SocketContext.tsx
└── public/
```

### Day 2-3: Authentication & User Management

#### 1. Type Definitions
```typescript
// src/types/user.types.ts
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatarUrl?: string;
  role: 'CUSTOMER' | 'PROVIDER' | 'ADMIN';
  emailVerified: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData extends LoginCredentials {
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}
```

#### 2. API Client Setup
```typescript
// src/api/client.ts
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for handling token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Handle 401 errors and refresh token logic
  }
);
```

#### 3. Authentication API
```typescript
// src/api/auth.api.ts
import { apiClient } from './client';
import { LoginCredentials, RegisterData, AuthResponse } from '../types/user.types';

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/login', credentials);
    return response.data;
  },

  register: async (userData: RegisterData): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/register', userData);
    return response.data;
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  },
};
```

#### 4. Auth Store (Zustand)
```typescript
// src/store/auth.store.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User } from '../types/user.types';
import { authApi } from '../api/auth.api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  login: (email: string, password: string) => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.login({ email, password });
          localStorage.setItem('accessToken', response.accessToken);
          localStorage.setItem('refreshToken', response.refreshToken);
          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error: any) {
          set({
            error: error.response?.data?.message || 'Login failed',
            isLoading: false,
          });
          throw error;
        }
      },

      register: async (userData) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.register(userData);
          localStorage.setItem('accessToken', response.accessToken);
          localStorage.setItem('refreshToken', response.refreshToken);
          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error: any) {
          set({
            error: error.response?.data?.message || 'Registration failed',
            isLoading: false,
          });
          throw error;
        }
      },

      logout: async () => {
        try {
          await authApi.logout();
        } finally {
          set({
            user: null,
            isAuthenticated: false,
          });
        }
      },

      loadUser: async () => {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          set({ isAuthenticated: false, user: null });
          return;
        }

        set({ isLoading: true });
        try {
          const user = await authApi.getCurrentUser();
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);
```

#### 5. Authentication Components
```tsx
// src/components/auth/LoginForm.tsx
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '../../store/auth.store';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const LoginForm: React.FC = () => {
  const { login, isLoading, error } = useAuthStore();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data.email, data.password);
    } catch (error) {
      // Error handled by store
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-md">
          {error}
        </div>
      )}
      
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email
        </label>
        <input
          {...register('email')}
          type="email"
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
        />
        {errors.email && (
          <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          Password
        </label>
        <input
          {...register('password')}
          type="password"
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
        />
        {errors.password && (
          <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
      >
        {isLoading ? 'Signing in...' : 'Sign In'}
      </button>
    </form>
  );
};
```

### Day 4-5: Main Layout & Routing

#### 1. App Router Setup
```tsx
// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { Layout } from './components/layout/Layout';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Services } from './pages/Services';
import { Profile } from './pages/Profile';
import { PrivateRoute } from './components/auth/PrivateRoute';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Protected routes */}
          <Route element={<PrivateRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/services" element={<Services />} />
              <Route path="/profile" element={<Profile />} />
            </Route>
          </Route>
          
          {/* Redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
    </QueryClientProvider>
  );
}

export default App;
```

#### 2. Main Layout Component
```tsx
// src/components/layout/Layout.tsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

export const Layout: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
```

## Phase 2: Service Marketplace (Weeks 2-3)

### Week 2: Service Discovery & Listings

#### 1. Service Types
```typescript
// src/types/service.types.ts
export interface ServiceListing {
  id: string;
  providerId: string;
  provider: {
    id: string;
    businessName?: string;
    user: {
      firstName: string;
      lastName: string;
    };
  };
  title: string;
  description: string;
  price: number;
  priceType: 'HOURLY' | 'FIXED' | 'CONSULTATION';
  category: Category;
  images: string[];
  isActive: boolean;
  views: number;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
}
```

#### 2. Service Listings Page
```tsx
// src/pages/Services.tsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ServiceCard } from '../components/services/ServiceCard';
import { SearchFilters } from '../components/services/SearchFilters';
import { servicesApi } from '../api/services.api';

export const Services: React.FC = () => {
  const [filters, setFilters] = useState({
    category: '',
    location: '',
    minPrice: 0,
    maxPrice: 1000,
    page: 1,
  });

  const { data: services, isLoading, error } = useQuery({
    queryKey: ['services', filters],
    queryFn: () => servicesApi.searchServices(filters),
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading services</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Find Local Services</h1>
        <p className="mt-2 text-gray-600">
          Discover verified service providers in your neighborhood
        </p>
      </div>

      <SearchFilters filters={filters} onFilterChange={setFilters} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services?.map((service) => (
          <ServiceCard key={service.id} service={service} />
        ))}
      </div>

      {services?.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No services found matching your criteria</p>
        </div>
      )}
    </div>
  );
};
```

#### 3. Service Card Component
```tsx
// src/components/services/ServiceCard.tsx
import React from 'react';
import { ServiceListing } from '../../types/service.types';
import { StarIcon } from '@heroicons/react/24/solid';
import { Link } from 'react-router-dom';

interface ServiceCardProps {
  service: ServiceListing;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({ service }) => {
  const formatPrice = () => {
    switch (service.priceType) {
      case 'HOURLY':
        return `$${service.price}/hour`;
      case 'FIXED':
        return `$${service.price}`;
      case 'CONSULTATION':
        return `Starting at $${service.price}`;
      default:
        return `$${service.price}`;
    }
  };

  return (
    <Link
      to={`/services/${service.id}`}
      className="group bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden"
    >
      {/* Image */}
      {service.images.length > 0 ? (
        <div className="aspect-w1 aspect-h1">
          <img
            src={service.images[0]}
            alt={service.title}
            className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-200"
          />
        </div>
      ) : (
        <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
          <span className="text-gray-400">No image</span>
        </div>
      )}

      <div className="p-4">
        {/* Category */}
        <div className="mb-2">
          <span className="inline-block px-2 py-1 text-xs font-semibold text-primary-700 bg-primary-50 rounded-full">
            {service.category.name}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600">
          {service.title}
        </h3>

        {/* Description */}
        <p className="mt-2 text-sm text-gray-600 line-clamp-2">
          {service.description}
        </p>

        {/* Provider */}
        <div className="mt-3 flex items-center">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
              <span className="text-xs font-medium text-gray-600">
                {service.provider.user.firstName[0]}
                {service.provider.user.lastName[0]}
              </span>
            </div>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-900">
              {service.provider.businessName || 
               `${service.provider.user.firstName} ${service.provider.user.lastName}`}
            </p>
          </div>
        </div>

        {/* Price & Rating */}
        <div className="mt-4 flex items-center justify-between">
          <div>
            <p className="text-lg font-bold text-gray-900">{formatPrice()}</p>
          </div>
          <div className="flex items-center">
            <StarIcon className="w-5 h-5 text-yellow-400" />
            <span className="ml-1 text-sm text-gray-600">4.8</span>
          </div>
        </div>

        {/* Action Button */}
        <button className="mt-4 w-full py-2 px-4 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-md transition-colors duration-200">
          View Details
        </button>
      </div>
    </Link>
  );
};
```

### Week 3: Booking System & Provider Profiles

#### 1. Booking Wizard Component
```tsx
// src/components/booking/BookingWizard.tsx
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const bookingSchema = z.object({
  serviceId: z.string(),
  date: z.date(),
  time: z.string(),
  duration: z.number().min(30).max(480),
  notes: z.string().optional(),
  // Payment details would be added later
});

// Implementation of multi-step wizard
export const BookingWizard: React.FC<{ serviceId: string }> = ({ serviceId }) => {
  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  // Implementation details
};
```

## Phase 3: Advanced Features (Weeks 4-6)

### Week 4: Real-time Messaging

#### 1. Socket Context
```tsx
// src/context/SocketContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/auth.store';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated || !user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const newSocket = io(import.meta.env.VITE_WS_URL || 'http://localhost:3000', {
      auth: {
        token: localStorage.getItem('accessToken'),
      },
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('WebSocket connected');
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('WebSocket disconnected');
    });

    newSocket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [isAuthenticated, user]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
```

### Week 5: Map Integration

#### 1. Map Component with Mapbox
```tsx
// src/components/map/ServiceMap.tsx
import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { ServiceListing } from '../../types/service.types';

interface ServiceMapProps {
  services: ServiceListing[];
  center?: [number, number];
  zoom?: number;
}

export const ServiceMap: React.FC<ServiceMapProps> = ({
  services,
  center = [-74.5, 40],
  zoom = 9,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  
  useEffect(() => {
    if (!mapContainer.current) return;
    
    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center,
      zoom,
    });
    
    // Add markers for each service
    services.forEach((service) => {
      // Implementation with custom markers
    });
    
    return () => map.current?.remove();
  }, []);
  
  return <div ref={mapContainer} className="w-full h-96 rounded-lg" />;
};
```

### Week 6: Payment Integration

#### 1. Stripe Payment Form
```tsx
// src/components/payment/StripePaymentForm.tsx
import React, { useState } from 'react';
import {
  CardElement,
  Elements,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const PaymentForm: React.FC<{ amount: number; onSuccess: () => void }> = ({
  amount,
  onSuccess,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements) return;
    
    setProcessing(true);
    setError(null);
    
    try {
      // Implementation
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {/* Card element and payment details */}
    </form>
  );
};

export const StripePaymentForm: React.FC<{ amount: number; onSuccess: () => void }> = (props) => (
  <Elements stripe={stripePromise}>
    <PaymentForm {...props} />
  </Elements>
);
```

## Phase 4: Testing & Optimization (Week 7-8)

### Week 7: Testing Setup

#### 1. Vitest Configuration
```javascript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
```

#### 2. Component Tests
```tsx
// src/components/auth/LoginForm.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from './LoginForm';

describe('LoginForm', () => {
  it('should render login form', () => {
    render(<LoginForm />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });
  
  it('should validate email format', async () => {
    render(<LoginForm />);
    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/invalid email address/i)).toBeInTheDocument();
    });
  });
});
```

### Week 8: Performance Optimization

#### 1. Code Splitting
```tsx
// Lazy load heavy components
const Services = React.lazy(() => import('./pages/Services'));
const ProviderProfile = React.lazy(() => import('./pages/ProviderProfile'));

// In App.tsx
<Suspense fallback={<LoadingSpinner />}>
  <Routes>
    <Route path="/services" element={<Services />} />
    <Route path="/providers/:id" element={<ProviderProfile />} />
  </Routes>
</Suspense>
```

#### 2. Image Optimization
```tsx
// Use next/image style lazy loading
const OptimizedImage: React.FC<{ src: string; alt: string }> = ({ src, alt }) => {
  const [loaded, setLoaded] = useState(false);
  
  return (
    <div className="relative overflow-hidden">
      {!loaded && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        className={`transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  );
};
```

## Ready for Engineer Assignment

This comprehensive frontend implementation plan provides:
1. Complete project structure setup
2. Authentication system with state management
3. Service marketplace UI components
4. Booking system implementation
5. Real-time features and maps integration
6. Payment processing
7. Testing and optimization strategies

The Frontend Engineer can start immediately with Day 1 tasks and follow the phased approach.