import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/hooks/use-workspace";
import { useSubscription } from "@/hooks/use-data";
import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const { data: workspace, isLoading: wsLoading } = useWorkspace();
  const { data: subscription, isLoading: subLoading } = useSubscription(workspace?.id);

  if (loading || (user && wsLoading) || (workspace && subLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const status = subscription?.status;
  if (status === "overdue" || status === "canceled") {
    return <Navigate to="/pagamento-pendente" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
