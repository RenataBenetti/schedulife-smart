import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle, XCircle, User } from "lucide-react";

type Status = "loading" | "valid" | "invalid" | "expired" | "completed_already" | "success";

interface ClientData {
  full_name: string;
  email: string;
  phone: string;
  cpf: string;
  rg: string;
  address_zip: string;
  address_street: string;
  address_number: string;
  address_complement: string;
  address_neighborhood: string;
  address_city: string;
  address_state: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export default function ClientRegistration() {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<Status>("loading");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<ClientData>({
    full_name: "",
    email: "",
    phone: "",
    cpf: "",
    rg: "",
    address_zip: "",
    address_street: "",
    address_number: "",
    address_complement: "",
    address_neighborhood: "",
    address_city: "",
    address_state: "",
  });

  useEffect(() => {
    if (!token) { setStatus("invalid"); return; }
    loadToken();
  }, [token]);

  const loadToken = async () => {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/client-registration?token=${encodeURIComponent(token!)}`,
        { headers: { "apikey": ANON_KEY, "Content-Type": "application/json" } }
      );
      const data = await res.json();

      if (res.status === 404) { setStatus("invalid"); return; }
      if (res.status === 409) { setStatus("completed_already"); return; }
      if (res.status === 410) { setStatus("expired"); return; }
      if (!res.ok) { setStatus("invalid"); return; }

      const c = data.client;
      if (c) {
        setForm({
          full_name: c.full_name ?? "",
          email: c.email ?? "",
          phone: c.phone ?? "",
          cpf: c.cpf ?? "",
          rg: c.rg ?? "",
          address_zip: c.address_zip ?? "",
          address_street: c.address_street ?? "",
          address_number: c.address_number ?? "",
          address_complement: c.address_complement ?? "",
          address_neighborhood: c.address_neighborhood ?? "",
          address_city: c.address_city ?? "",
          address_state: c.address_state ?? "",
        });
      }
      setStatus("valid");
    } catch {
      setStatus("invalid");
    }
  };

  const handleCepLookup = async (cep: string) => {
    const cleaned = cep.replace(/\D/g, "");
    if (cleaned.length !== 8) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setForm((prev) => ({
          ...prev,
          address_street: data.logradouro ?? prev.address_street,
          address_neighborhood: data.bairro ?? prev.address_neighborhood,
          address_city: data.localidade ?? prev.address_city,
          address_state: data.uf ?? prev.address_state,
        }));
      }
    } catch {}
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/client-registration`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        body: JSON.stringify({ token, ...form }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus("success");
      } else {
        alert(data.error ?? "Erro ao enviar. Tente novamente.");
      }
    } catch {
      alert("Erro de conexão. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  const toTitleCase = (str: string) =>
    str.replace(/\S+/g, (word) =>
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    );

  const f = (field: keyof ClientData) => ({
    value: form[field],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = field === "full_name"
        ? toTitleCase(e.target.value)
        : e.target.value;
      setForm((prev) => ({ ...prev, [field]: value }));
    },
  });

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (status === "invalid" || status === "expired" || status === "completed_already") {
    const messages: Record<string, { title: string; desc: string }> = {
      invalid: { title: "Link inválido", desc: "Este link de cadastro não existe ou é inválido." },
      expired: { title: "Link expirado", desc: "Este link de cadastro expirou. Solicite um novo link ao seu profissional." },
      completed_already: { title: "Cadastro já realizado", desc: "Você já preencheu este formulário anteriormente. Obrigado!" },
    };
    const msg = messages[status];
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-4 max-w-sm">
          <XCircle className="h-14 w-14 text-destructive mx-auto" />
          <h1 className="text-xl font-bold text-foreground">{msg.title}</h1>
          <p className="text-muted-foreground">{msg.desc}</p>
        </div>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-4 max-w-sm">
          <CheckCircle className="h-14 w-14 text-primary mx-auto" />
          <h1 className="text-xl font-bold text-foreground">Cadastro concluído!</h1>
          <p className="text-muted-foreground">Seus dados foram salvos com sucesso. Obrigado por preencher o formulário!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <User className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Formulário de Cadastro</h1>
          <p className="text-muted-foreground text-sm">Preencha seus dados para completar o cadastro.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-border bg-card p-6 shadow-sm">
          {/* Personal data */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider text-muted-foreground">Dados Pessoais</h2>
            <div className="space-y-2">
              <Label>Nome Completo *</Label>
              <Input placeholder="João da Silva" required {...f("full_name")} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>CPF</Label>
                <Input placeholder="000.000.000-00" {...f("cpf")} />
              </div>
              <div className="space-y-2">
                <Label>RG</Label>
                <Input placeholder="00.000.000-0" {...f("rg")} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Telefone / WhatsApp</Label>
                <Input placeholder="(11) 98765-4321" {...f("phone")} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" placeholder="joao@exemplo.com" {...f("email")} />
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider text-muted-foreground">Endereço</h2>
            <div className="space-y-2">
              <Label>CEP</Label>
              <Input
                placeholder="00000-000"
                {...f("address_zip")}
                onBlur={(e) => handleCepLookup(e.target.value)}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, address_zip: e.target.value }));
                }}
              />
              <p className="text-xs text-muted-foreground">Digite o CEP para preenchimento automático.</p>
            </div>
            <div className="grid grid-cols-[1fr_120px] gap-4">
              <div className="space-y-2">
                <Label>Rua / Logradouro</Label>
                <Input placeholder="Rua das Flores" {...f("address_street")} />
              </div>
              <div className="space-y-2">
                <Label>Número</Label>
                <Input placeholder="123" {...f("address_number")} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Complemento</Label>
                <Input placeholder="Apto 12" {...f("address_complement")} />
              </div>
              <div className="space-y-2">
                <Label>Bairro</Label>
                <Input placeholder="Centro" {...f("address_neighborhood")} />
              </div>
            </div>
            <div className="grid grid-cols-[1fr_80px] gap-4">
              <div className="space-y-2">
                <Label>Cidade</Label>
                <Input placeholder="São Paulo" {...f("address_city")} />
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Input placeholder="SP" maxLength={2} {...f("address_state")} />
              </div>
            </div>
          </div>

          <Button type="submit" variant="hero" className="w-full" disabled={submitting || !form.full_name.trim()}>
            {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</> : "Enviar Cadastro"}
          </Button>
        </form>
      </div>
    </div>
  );
}
