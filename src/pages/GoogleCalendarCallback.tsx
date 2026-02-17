import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const GoogleCalendarCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const success = searchParams.get("success");
    if (success === "true") {
      toast({ title: "Google Calendar conectado com sucesso!" });
    } else {
      toast({ variant: "destructive", title: "Erro ao conectar Google Calendar" });
    }
    navigate("/dashboard", { replace: true });
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
};

export default GoogleCalendarCallback;
