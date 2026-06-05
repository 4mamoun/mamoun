import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import DataSync from '@/components/DataSync';
import ErrorBoundary from '@/components/ErrorBoundary';
import Login from '@/pages/Login';

/* ─── Lazy-loaded pages (28) ─── */
const Dashboard          = lazy(() => import('@/pages/Dashboard'));
const Projects           = lazy(() => import('@/pages/Projects'));
const Batches            = lazy(() => import('@/pages/Batches'));
const Packing            = lazy(() => import('@/pages/Packing'));
const Containers         = lazy(() => import('@/pages/Containers'));
const Shipments          = lazy(() => import('@/pages/Shipments'));
const Delivery           = lazy(() => import('@/pages/Delivery'));
const Installation       = lazy(() => import('@/pages/Installation'));
const Products           = lazy(() => import('@/pages/Products'));
const Parts              = lazy(() => import('@/pages/Parts'));
const Tops               = lazy(() => import('@/pages/Tops'));
const Accessories        = lazy(() => import('@/pages/Accessories'));
const Warehouse          = lazy(() => import('@/pages/Warehouse'));
const Users              = lazy(() => import('@/pages/Users'));
const Settings           = lazy(() => import('@/pages/Settings'));
const Profile            = lazy(() => import('@/pages/Profile'));
const FollowUp           = lazy(() => import('@/pages/FollowUp'));
const NotesSummary       = lazy(() => import('@/pages/NotesSummary'));
const PickList           = lazy(() => import('@/pages/PickList'));
const PackingListReport  = lazy(() => import('@/pages/PackingListReport'));
const Quality            = lazy(() => import('@/pages/Quality'));
const Reports            = lazy(() => import('@/pages/Reports'));
const Roles              = lazy(() => import('@/pages/Roles'));
const PendingApproval    = lazy(() => import('@/pages/PendingApproval'));
const PublicItem         = lazy(() => import('@/pages/PublicItem'));
const AccessoryDocs      = lazy(() => import('@/pages/AccessoryDocs'));
const BatchNotesPage     = lazy(() => import('@/pages/BatchNotesPage'));

/* ─── Simple loading spinner for Suspense fallback ─── */
function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(180deg, #0c1222 0%, #0f172a 40%, #1a1f3a 100%)' }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
        <p className="text-sm text-gray-400">جاري التحميل...</p>
      </div>
    </div>
  );
}

/* ─── Wrap lazy pages in Suspense ─── */
function SuspendedRoute({ element }: { element: React.ReactNode }) {
  return <Suspense fallback={<Loading />}>{element}</Suspense>;
}

function App() {
  return (
    <ErrorBoundary>
      <DataSync />
      <Routes>
        {/* Public routes — no layout needed */}
        <Route path="/login" element={<Login />} />
        <Route path="/pending-approval" element={<SuspendedRoute element={<PendingApproval />} />} />
        <Route path="/public-item/:barcode" element={<SuspendedRoute element={<PublicItem />} />} />
        <Route path="/accessory-docs" element={<SuspendedRoute element={<AccessoryDocs />} />} />

        {/* Protected routes — inside Layout */}
        <Route element={<Layout />}>
          <Route path="/"                element={<SuspendedRoute element={<Dashboard />} />} />
          <Route path="/dashboard"       element={<SuspendedRoute element={<Dashboard />} />} />
          <Route path="/projects"        element={<SuspendedRoute element={<Projects />} />} />
          <Route path="/batches"         element={<SuspendedRoute element={<Batches />} />} />
          <Route path="/packing"         element={<SuspendedRoute element={<Packing />} />} />
          <Route path="/containers"      element={<SuspendedRoute element={<Containers />} />} />
          <Route path="/shipments"       element={<SuspendedRoute element={<Shipments />} />} />
          <Route path="/delivery"        element={<SuspendedRoute element={<Delivery />} />} />
          <Route path="/installation"    element={<SuspendedRoute element={<Installation />} />} />
          <Route path="/products"        element={<SuspendedRoute element={<Products />} />} />
          <Route path="/parts"           element={<SuspendedRoute element={<Parts />} />} />
          <Route path="/tops"            element={<SuspendedRoute element={<Tops />} />} />
          <Route path="/accessories"     element={<SuspendedRoute element={<Accessories />} />} />
          <Route path="/warehouse"       element={<SuspendedRoute element={<Warehouse />} />} />
          <Route path="/stock"           element={<Navigate to="/warehouse" replace />} />
          <Route path="/users"           element={<SuspendedRoute element={<Users />} />} />
          <Route path="/settings"        element={<SuspendedRoute element={<Settings />} />} />
          <Route path="/profile"         element={<SuspendedRoute element={<Profile />} />} />
          <Route path="/followup"        element={<SuspendedRoute element={<FollowUp />} />} />
          <Route path="/notes-summary"   element={<SuspendedRoute element={<NotesSummary />} />} />
          <Route path="/pick-list"       element={<SuspendedRoute element={<PickList />} />} />
          <Route path="/packing-list-report" element={<SuspendedRoute element={<PackingListReport />} />} />
          <Route path="/quality"         element={<SuspendedRoute element={<Quality />} />} />
          <Route path="/reports"         element={<SuspendedRoute element={<Reports />} />} />
          <Route path="/roles"           element={<SuspendedRoute element={<Roles />} />} />
          <Route path="/batch/:batchId/notes" element={<SuspendedRoute element={<BatchNotesPage />} />} />
          <Route path="*"                element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}

export default App;
