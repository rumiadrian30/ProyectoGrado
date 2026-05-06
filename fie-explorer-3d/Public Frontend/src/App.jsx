import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/ui/Navbar';
import LoadingScreen from './components/ui/LoadingScreen';

const Home      = React.lazy(() => import('./pages/Home'));
const Explorer  = React.lazy(() => import('./pages/Explorer'));
const Directorio = React.lazy(() => import('./pages/Directorio'));
const AcercaDe  = React.lazy(() => import('./pages/AcercaDe'));
const Ayuda     = React.lazy(() => import('./pages/Ayuda'));
const DemoPrivacidad = React.lazy(() => import('./pages/DemoPrivacidad'));

export default function App() {
  return (
    <>
      <Navbar />
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/"                     element={<Home />} />
          <Route path="/explorar"             element={<Explorer />} />
          <Route path="/explorar/:buildingId" element={<Explorer />} />
          <Route path="/directorio"           element={<Directorio />} />
          <Route path="/acerca-de"            element={<AcercaDe />} />
          <Route path="/ayuda"                element={<Ayuda />} />
          <Route path="/demo-privacidad"      element={<DemoPrivacidad />} />
          <Route path="*"                     element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}