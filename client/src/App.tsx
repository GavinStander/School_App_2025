import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import AdminDashboard from "@/pages/admin-dashboard";
import SchoolDashboard from "@/pages/school-dashboard";
import StudentDashboard from "@/pages/student-dashboard";
import { ProtectedRoute } from "./lib/protected-route";
import { AuthProvider } from "./hooks/use-auth";
import { queryClient } from "./lib/queryClient";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute
        path="/"
        roleCheck={(user) => user.role === "admin"}
        component={AdminDashboard}
        fallbackPath="/school"
      />
      <ProtectedRoute
        path="/school"
        roleCheck={(user) => user.role === "school"}
        component={SchoolDashboard}
        fallbackPath="/student"
      />
      <ProtectedRoute
        path="/student"
        roleCheck={(user) => user.role === "student"}
        component={StudentDashboard}
        fallbackPath="/"
      />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
