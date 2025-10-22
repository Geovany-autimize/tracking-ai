import { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PhoneFieldPro from "@/components/forms/PhoneFieldPro";
import PasswordField from "@/components/forms/PasswordField";
import { isValidE164 } from '@/lib/phone';

const signupSchema = z.object({
  name: z.string().min(2, 'Informe seu nome completo'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(8, 'Mínimo de 8 caracteres'),
  plan: z.enum(['free', 'premium']).default('free'),
  whatsapp_e164: z.string().min(1, 'WhatsApp é obrigatório').refine(isValidE164, 'WhatsApp inválido'),
});

export default function Signup() {
  const [searchParams] = useSearchParams();
  const planParam = searchParams.get("plan");
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsappE164, setWhatsappE164] = useState("");
  const [password, setPassword] = useState("");
  const [plan, setPlan] = useState(planParam || "free");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const { signup, customer } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (customer) {
      navigate('/dashboard');
    }
  }, [customer, navigate]);

  useEffect(() => {
    if (planParam) {
      setPlan(planParam);
    }
  }, [planParam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const parsed = signupSchema.safeParse({
      name,
      email,
      password,
      plan,
      whatsapp_e164: whatsappE164,
    });

    if (!parsed.success) {
      const errorMap: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        errorMap[issue.path.join('.')] = issue.message;
      });
      setErrors(errorMap);
      toast({
        title: "Erro de validação",
        description: "Por favor, corrija os erros no formulário.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      await signup(name, email, password, whatsappE164, plan);
      toast({
        title: "Conta criada!",
        description: "Sua conta foi criada com sucesso.",
      });
      navigate('/dashboard');
    } catch (error: any) {
      const msg = error?.message || "Tente novamente mais tarde.";
      if (msg.toLowerCase().includes('já está cadastrado')) {
        setErrors((prev) => ({ ...prev, email: msg }));
      }
      toast({
        title: "Erro ao criar conta",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <Link to="/" className="inline-block">
            <h1 className="text-3xl font-bold">TrackingAI</h1>
          </Link>
          <h2 className="text-2xl font-bold">Crie sua conta</h2>
          <p className="text-muted-foreground">
            Comece no plano Free (5 créditos/mês) ou assine o Premium quando precisar escalar.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Nome completo</Label>
            <Input
              id="name"
              type="text"
              placeholder="Seu nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>

          <PhoneFieldPro
            label="WhatsApp"
            required
            value={whatsappE164}
            onChange={setWhatsappE164}
            error={errors.whatsapp_e164}
            defaultCountry="BR"
            helperText="Selecione o país ou digite o DDI (+55) e informe seu número."
          />

          <PasswordField
            value={password}
            onChange={setPassword}
            error={errors.password}
            minLength={8}
          />

          <div className="space-y-2">
            <Label htmlFor="plan">Plano</Label>
            <Select value={plan} onValueChange={setPlan}>
              <SelectTrigger id="plan">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free - R$ 0/mês (5 créditos)</SelectItem>
                <SelectItem value="premium">Premium - R$ 249/mês (1.500 créditos)</SelectItem>
              </SelectContent>
            </Select>
            {errors.plan && <p className="text-xs text-destructive">{errors.plan}</p>}
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Criando conta..." : "Criar conta"}
          </Button>
        </form>

        <div className="text-xs text-center text-muted-foreground">
          Ao continuar, você concorda com os{" "}
          <Link to="/terms" className="text-primary hover:underline">
            Termos de Uso
          </Link>{" "}
          e a{" "}
          <Link to="/privacy" className="text-primary hover:underline">
            Política de Privacidade
          </Link>
          .
        </div>

        <div className="text-center text-sm">
          <p className="text-muted-foreground">
            Já tem uma conta?{" "}
            <Link to="/login" className="text-primary hover:underline">
              Entrar
            </Link>
          </p>
        </div>

        <div className="pt-4 text-center">
          <Link to="/" className="text-sm text-muted-foreground hover:text-primary">
            ← Voltar para a página inicial
          </Link>
        </div>
      </div>
    </div>
  );
}
