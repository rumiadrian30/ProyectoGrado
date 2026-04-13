import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/ui/Navbar';
import LoadingScreen from './components/ui/LoadingScreen';
import { useAdminStore } from './store/adminStore';

// Lazy pages
const Home     = React.lazy(() => import('./pages/Home'));
const Explorer = React.lazy(() => import('./pages/Explorer'));
const Login    = React.lazy(() => import('./pages/Login'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));

// Ruta protegida
const PrivateRoute = ({ children }) => {
  const { token } = useAdminStore();
  return token ? children : <Navigate to="/admin/login" replace />;
};

export default function App() {
  return (
    <>
      <Navbar />
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/"            element={<Home />} />
          <Route path="/explorar"    element={<Explorer />} />
          <Route path="/explorar/:buildingId" element={<Explorer />} />
          <Route path="/admin/login" element={<Login />} />
          <Route path="/admin"       element={
            <PrivateRoute><Dashboard /></PrivateRoute>
          } />
          <Route path="*"            element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}
