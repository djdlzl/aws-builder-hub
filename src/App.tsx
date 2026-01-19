import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { ThemeProvider } from "@/hooks/use-theme";
import { AWSProvider } from "@/hooks/use-aws-context";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import EC2 from "./pages/EC2";
import RDS from "./pages/RDS";
import S3 from "./pages/S3";
import VPC from "./pages/VPC";
import Modules from "./pages/Modules";
import Templates from "./pages/Templates";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import AWSAccounts from "./pages/AWSAccounts";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <AWSProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <MainLayout>
                        <Index />
                      </MainLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/ec2"
                  element={
                    <ProtectedRoute>
                      <MainLayout>
                        <EC2 />
                      </MainLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/rds"
                  element={
                    <ProtectedRoute>
                      <MainLayout>
                        <RDS />
                      </MainLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/s3"
                  element={
                    <ProtectedRoute>
                      <MainLayout>
                        <S3 />
                      </MainLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/vpc"
                  element={
                    <ProtectedRoute>
                      <MainLayout>
                        <VPC />
                      </MainLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/modules"
                  element={
                    <ProtectedRoute>
                      <MainLayout>
                        <Modules />
                      </MainLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/templates"
                  element={
                    <ProtectedRoute>
                      <MainLayout>
                        <Templates />
                      </MainLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <MainLayout>
                        <Settings />
                      </MainLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin-settings"
                  element={
                    <ProtectedRoute requiredRole="admin">
                      <MainLayout>
                        <AWSAccounts />
                      </MainLayout>
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </AWSProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
