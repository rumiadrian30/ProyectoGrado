import React, { Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/ui/Navbar';
import LoadingScreen from './components/ui/LoadingScreen';
import Footer from './components/ui/Footer'; 
import AppErrorBoundary from './components/common/AppErrorBoundary';

const Home      = React.lazy(() => import('./pages/Home'));
const Explorer  = React.lazy(() => import('./pages/Explorer'));
const Directorio = React.lazy(() => import('./pages/Directorio'));
const AcercaDe  = React.lazy(() => import('./pages/AcercaDe'));
const Ayuda     = React.lazy(() => import('./pages/Ayuda'));

export default function App() {
  const location = useLocation();
  const hideFooterRoutes = ['/explorar', '/admin', '/dashboard'];
  const shouldHideFooter = hideFooterRoutes.some(route => 
    location.pathname.startsWith(route)
  );
  return (
    
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <main style={{ flex: 1 }}>
        <Suspense fallback={<LoadingScreen />}>
        <AppErrorBoundary>
            <Routes>
              <Route path="/"                     element={<Home />} />
              <Route path="/explorar"             element={<Explorer />} />
              <Route path="/explorar/:buildingId" element={<Explorer />} />
              <Route path="/directorio"           element={<Directorio />} />
              <Route path="/acerca-de"            element={<AcercaDe />} />
              <Route path="/ayuda"                element={<Ayuda />} />
              <Route path="*"                     element={<Navigate to="/" replace />} />
            </Routes>
          </AppErrorBoundary>
        </Suspense>
      </main>
      {!shouldHideFooter && <Footer />}
    </div>
  );
}