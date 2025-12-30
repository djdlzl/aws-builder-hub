import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { ThemeProvider } from "@/hooks/use-theme";
import { AWSProvider } from "@/hooks/use-aws-context";
import Index from "./pages/Index";
import EC2 from "./pages/EC2";
import RDS from "./pages/RDS";
import S3 from "./pages/S3";
import Modules from "./pages/Modules";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AWSProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<MainLayout><Index /></MainLayout>} />
              <Route path="/ec2" element={<MainLayout><EC2 /></MainLayout>} />
              <Route path="/rds" element={<MainLayout><RDS /></MainLayout>} />
              <Route path="/s3" element={<MainLayout><S3 /></MainLayout>} />
              <Route path="/modules" element={<MainLayout><Modules /></MainLayout>} />
              <Route path="/settings" element={<MainLayout><Settings /></MainLayout>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AWSProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;