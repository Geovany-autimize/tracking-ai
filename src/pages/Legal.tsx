import { Link, Outlet, useLocation } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Legal() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentTab = location.pathname.includes("politica-de-privacidade") ? "privacy" : "terms";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link to="/" className="text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-semibold">Documentos Legais</h1>
        </div>
      </header>

      <main className="container max-w-4xl mx-auto px-4 py-8">
        <Tabs value={currentTab} className="w-full">
          <TabsList className="w-full max-w-md">
            <TabsTrigger value="terms" className="flex-1" onClick={() => navigate("/legal/termos-de-uso")}>Termos de Uso</TabsTrigger>
            <TabsTrigger value="privacy" className="flex-1" onClick={() => navigate("/legal/politica-de-privacidade")}>Política de Privacidade</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="mt-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
