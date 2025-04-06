import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import AdminDashboard from "@/pages/admin-dashboard";
import SchoolDashboard from "@/pages/school-dashboard";
import SchoolStudentsPage from "@/pages/school-students-page";
import SchoolFundraisersPage from "@/pages/school-fundraisers-page";
import SchoolProfilePage from "@/pages/school-profile-page";
import StudentDashboard from "@/pages/student-dashboard";
import StudentFundraisersPage from "@/pages/student-fundraisers-page";
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
        path="/school/students"
        roleCheck={(user) => user.role === "school"}
        component={SchoolStudentsPage}
        fallbackPath="/school"
      />
      <ProtectedRoute
        path="/school/fundraisers"
        roleCheck={(user) => user.role === "school"}
        component={SchoolFundraisersPage}
        fallbackPath="/school"
      />
      <ProtectedRoute
        path="/school/profile"
        roleCheck={(user) => user.role === "school"}
        component={SchoolProfilePage}
        fallbackPath="/school"
      />
      <ProtectedRoute
        path="/student"
        roleCheck={(user) => user.role === "student"}
        component={StudentDashboard}
        fallbackPath="/"
      />
      <ProtectedRoute
        path="/student/fundraisers"
        roleCheck={(user) => user.role === "student"}
        component={StudentFundraisersPage}
        fallbackPath="/student"
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
