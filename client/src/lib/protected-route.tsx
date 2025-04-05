import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";
import { User } from "@shared/schema";

type ProtectedRouteProps = {
  path: string;
  component: () => React.JSX.Element;
  roleCheck?: (user: User) => boolean;
  fallbackPath?: string;
};

export function ProtectedRoute({
  path,
  component: Component,
  roleCheck,
  fallbackPath = "/auth",
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Route>
    );
  }

  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  // If a role check is provided and the user doesn't pass it
  if (roleCheck && !roleCheck(user)) {
    return (
      <Route path={path}>
        <Redirect to={fallbackPath} />
      </Route>
    );
  }

  return <Route path={path} component={Component} />;
}
