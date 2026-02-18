import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
// Input and Label still used in other steps
import {
  Calendar,
  MessageSquare,
  Link as LinkIcon,
  Users,
  ArrowRight,
  ArrowLeft,
  Check,
  CheckCircle2,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const steps = [
  { title: "WhatsApp", icon: MessageSquare },
  { title: "Google Calendar", icon: Calendar },
  { title: "Mensagem", icon: LinkIcon },
  { title: "Primeiro Cliente", icon: Users },
];

const SetupWizard = () => {
  const [currentStep, setCurrentStep] = useState(0);

  const next = () => setCurrentStep((s) => Math.min(s + 1, steps.length - 1));
  const prev = () => setCurrentStep((s) => Math.max(s - 1, 0));

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center">
            <Calendar className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-foreground">Setup do Agendix</span>
        </div>
      </div>

      {/* Stepper */}
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="flex items-center justify-between mb-10">
          {steps.map((step, i) => (
            <div key={step.title} className="flex items-center gap-2 flex-1">
              <div
                className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                  i < currentStep
                    ? "bg-accent text-accent-foreground"
                    : i === currentStep
                    ? "gradient-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {i < currentStep ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <step.icon className="h-5 w-5" />
                )}
              </div>
              <span
                className={`text-xs font-medium hidden sm:block ${
                  i <= currentStep ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {step.title}
              </span>
              {i < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 ${
                    i < currentStep ? "bg-accent" : "bg-border"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="rounded-xl border border-border bg-card p-8 shadow-card">
          {currentStep === 0 && <WhatsAppStep />}
          {currentStep === 1 && <GoogleCalendarStep />}
          {currentStep === 2 && <MessageTemplateStep />}
          {currentStep === 3 && <FirstClientStep />}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <Button variant="ghost" onClick={prev} disabled={currentStep === 0}>
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          {currentStep < steps.length - 1 ? (
            <Button variant="hero" onClick={next}>
              Próximo
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button variant="hero" onClick={() => window.location.href = "/dashboard"}>
              Concluir setup
              <CheckCircle2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

const WhatsAppStep = () => (
  <div className="space-y-6">
    <div>
      <h2 className="text-xl font-bold text-foreground mb-1">Conectar WhatsApp via QR Code</h2>
      <p className="text-sm text-muted-foreground">
        Use a Evolution API para conectar seu WhatsApp escaneando um QR Code — sem precisar de conta Business na Meta.
      </p>
    </div>

    <div className="space-y-3">
      <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-4">
        <div className="h-7 w-7 rounded-full gradient-primary flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-xs font-bold text-primary-foreground">1</span>
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Tenha um servidor Evolution API</p>
          <p className="text-xs text-muted-foreground mt-0.5">Você precisará da URL do servidor, da API Key e de um nome para a instância.</p>
        </div>
      </div>
      <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-4">
        <div className="h-7 w-7 rounded-full gradient-primary flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-xs font-bold text-primary-foreground">2</span>
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Configure em Integrações</p>
          <p className="text-xs text-muted-foreground mt-0.5">Após concluir este setup, vá em <strong>Configurações → Integrações</strong> para inserir os dados e escanear o QR Code.</p>
        </div>
      </div>
      <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-4">
        <div className="h-7 w-7 rounded-full gradient-primary flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-xs font-bold text-primary-foreground">3</span>
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Escaneie com seu celular</p>
          <p className="text-xs text-muted-foreground mt-0.5">Abra o WhatsApp no celular, acesse Aparelhos conectados e escaneie o QR Code gerado.</p>
        </div>
      </div>
    </div>

    <div className="rounded-lg bg-accent/20 border border-accent/30 p-4 text-sm text-foreground">
      <strong>💡 Dica:</strong> Recomendamos usar um número de telefone dedicado para o WhatsApp do consultório, separado do seu número pessoal.
    </div>
  </div>
);

const GoogleCalendarStep = () => (
  <div className="space-y-6">
    <div>
      <h2 className="text-xl font-bold text-foreground mb-1">Conectar Google Calendar</h2>
      <p className="text-sm text-muted-foreground">
        Sincronize sua agenda para que seus agendamentos apareçam automaticamente.
      </p>
    </div>
    <div className="flex flex-col items-center gap-4 py-8">
      <Button variant="outline" size="lg">
        <Calendar className="h-5 w-5" />
        Conectar com Google
      </Button>
      <p className="text-xs text-muted-foreground text-center max-w-xs">
        Após conectar, selecione o calendário padrão para seus agendamentos.
      </p>
    </div>
    <div className="space-y-2">
      <Label>Calendário padrão</Label>
      <Select disabled>
        <SelectTrigger>
          <SelectValue placeholder="Conecte o Google primeiro" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="primary">Calendário principal</SelectItem>
        </SelectContent>
      </Select>
    </div>
  </div>
);

const MessageTemplateStep = () => (
  <div className="space-y-6">
    <div>
      <h2 className="text-xl font-bold text-foreground mb-1">Criar template de mensagem</h2>
      <p className="text-sm text-muted-foreground">
        Configure seu primeiro template de confirmação automática.
      </p>
    </div>
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Nome do template</Label>
        <Input placeholder="Ex: Confirmação de sessão" />
      </div>
      <div className="space-y-2">
        <Label>Mensagem</Label>
        <Textarea
          placeholder={`Olá {cliente_nome}! Sua sessão está marcada para {data} às {hora}. Confirme respondendo SIM.`}
          rows={4}
        />
        <p className="text-xs text-muted-foreground">
          Variáveis disponíveis: {"{cliente_nome}"}, {"{data}"}, {"{hora}"}, {"{link_pagamento}"}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Quando enviar</Label>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="antes_da_sessao">Antes da sessão</SelectItem>
              <SelectItem value="apos_confirmacao">Após confirmação</SelectItem>
              <SelectItem value="apos_sessao">Após sessão</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Antecedência</Label>
          <div className="flex gap-2">
            <Input type="number" placeholder="24" className="w-20" />
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Unidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="minutos">Minutos</SelectItem>
                <SelectItem value="horas">Horas</SelectItem>
                <SelectItem value="dias">Dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const FirstClientStep = () => (
  <div className="space-y-6">
    <div>
      <h2 className="text-xl font-bold text-foreground mb-1">Cadastrar primeiro cliente</h2>
      <p className="text-sm text-muted-foreground">
        Adicione um cliente e crie seu primeiro agendamento.
      </p>
    </div>
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Nome completo</Label>
        <Input placeholder="Ex: Maria Silva" />
      </div>
      <div className="space-y-2">
        <Label>Email</Label>
        <Input type="email" placeholder="maria@email.com" />
      </div>
      <div className="space-y-2">
        <Label>WhatsApp</Label>
        <Input placeholder="(11) 99999-9999" />
      </div>
      <div className="border-t border-border pt-4 mt-4">
        <h3 className="font-semibold text-foreground mb-3">Primeiro agendamento</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Data</Label>
            <Input type="date" />
          </div>
          <div className="space-y-2">
            <Label>Horário</Label>
            <Input type="time" />
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default SetupWizard;
