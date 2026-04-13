import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/ui/Navbar';
import LoadingScreen from './components/ui/LoadingScreen';

const Home     = React.lazy(() => import('./pages/Home'));
const Explorer = React.lazy(() => import('./pages/Explorer'));

export default function App() {
  return (
    <>
      <Navbar />
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/"                     element={<Home />} />
          <Route path="/explorar"             element={<Explorer />} />
          <Route path="/explorar/:buildingId" element={<Explorer />} />
          <Route path="*"                     element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}
