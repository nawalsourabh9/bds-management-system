import React, { useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

// Import all pages
import Index from "@/pages/Index";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import ResetPassword from "@/pages/ResetPassword";
import AcceptInvite from "@/pages/AcceptInvite";
import CreateAdmin from "@/pages/CreateAdmin";
import Tasks from "@/pages/Tasks";
import Documents from "@/pages/Documents";
import NonConformances from "@/pages/NonConformances";
import Audits from "@/pages/Audits";
import Analytics from "@/pages/Analytics";
import Users from "@/pages/Users";
import DepartmentsPage from "@/pages/DepartmentsPage";
import { PositionsPage } from "@/pages/PositionsPage";
import MindMapOrganization from "@/pages/MindMapOrganization";
import MindMapDepartments from "@/pages/MindMapDepartments";
import MindMapTasks from "@/pages/MindMapTasks";
import MindMapProcesses from "@/pages/MindMapProcesses";
import Profile from "@/pages/Profile";
import Help from "@/pages/Help";
import EmailTest from "@/pages/EmailTest";
import InviteUser from "@/pages/InviteUser";
import NotFound from "@/pages/NotFound";
import ChangePassword from "@/pages/ChangePassword";
import CalendarPage from "@/pages/Calendar";
import DepartmentSummary from "@/pages/DepartmentSummary";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const isPreviewMode = new URLSearchParams(location.search).get('preview') === 'true';
  
  // Check for employee in localStorage as a fallback when useAuth() doesn't work
  const employeeData = localStorage.getItem('employee');
  const hasEmployee = Boolean(employeeData);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Allow access if either auth API says user is logged in OR we have employee data in localStorage
  if ((!user && !hasEmployee) && !isPreviewMode) {
    console.log("No auth detected, redirecting to login");
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  
  // Check for employee in localStorage as a fallback
  const employeeData = localStorage.getItem('employee');
  const hasEmployee = Boolean(employeeData);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user && !hasEmployee) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

const SuperAdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/accept-invite" element={<AcceptInvite />} />
      <Route path="/create-admin" element={<CreateAdmin />} />
      
      <Route path="/" element={
        <ProtectedRoute>
          <MainLayout>
            <Index />
          </MainLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/change-password" element={
        <ProtectedRoute>
          <MainLayout>
            <ChangePassword />
          </MainLayout>
        </ProtectedRoute>
      } />
      
      {[
        { path: "/tasks", element: <Tasks /> },
        { path: "/calendar", element: <CalendarPage /> },
        { path: "/documents", element: <Documents /> },
        { path: "/non-conformances", element: <NonConformances /> },
        { path: "/audits", element: <Audits /> },
        { path: "/analytics", element: <Analytics /> },
        { path: "/users", element: <Users /> },
        { path: "/departments", element: <DepartmentsPage /> },
        { path: "/positions", element: <PositionsPage /> },
        { path: "/department-summary", element: <DepartmentSummary /> },
        { path: "/mind-map/organization", element: <MindMapOrganization /> },
        { path: "/mind-map/departments", element: <MindMapDepartments /> },
        { path: "/mind-map/tasks", element: <MindMapTasks /> },
        { path: "/mind-map/processes", element: <MindMapProcesses /> },
        { path: "/profile", element: <Profile /> },
        { path: "/help", element: <Help /> },
        { path: "/email-test", element: <EmailTest /> }
      ].map(({ path, element }) => (
        <Route key={path} path={path} element={
          <ProtectedRoute>
            <MainLayout>{element}</MainLayout>
          </ProtectedRoute>
        } />
      ))}
      
      <Route path="/invite-user" element={
        <SuperAdminRoute>
          <InviteUser />
        </SuperAdminRoute>
      } />
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};
