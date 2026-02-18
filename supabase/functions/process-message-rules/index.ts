import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Substitui variáveis dinâmicas no template
function substituteVariables(body: string, vars: Record<string, string>): string {
  return body
    .replace(/\{\{nome_cliente\}\}/g, vars.nome_cliente ?? "")
    .replace(/\{\{data_sessao\}\}/g, vars.data_sessao ?? "")
    .replace(/\{\{hora_sessao\}\}/g, vars.hora_sessao ?? "")
    .replace(/\{\{nome_profissional\}\}/g, vars.nome_profissional ?? "");
}

// Formata data e hora em pt-BR
function formatDateTime(dateStr: string) {
  const d = new Date(dateStr);
  const data = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return { data, hora };
}

// Converte offset para milissegundos
function offsetToMs(value: number, unit: string): number {
  if (unit === "minutos") return value * 60 * 1000;
  if (unit === "horas") return value * 60 * 60 * 1000;
  if (unit === "dias") return value * 24 * 60 * 60 * 1000;
  return 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const now = new Date();
  const windowMs = 5 * 60 * 1000; // 5 minutos de tolerância

  try {
    // 1. Buscar workspaces com Evolution API conectada
    const { data: configs, error: configErr } = await supabase
      .from("whatsapp_config")
      .select("workspace_id, evolution_api_url, evolution_api_key, evolution_instance, connection_status")
      .eq("connection_status", "connected");

    if (configErr) throw configErr;
    if (!configs || configs.length === 0) {
      return new Response(JSON.stringify({ message: "Nenhum workspace com WhatsApp conectado", processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let totalSent = 0;
    let totalErrors = 0;

    for (const config of configs) {
      const { workspace_id } = config;

      // 2. Buscar regras ativas do workspace
      const { data: rules, error: rulesErr } = await supabase
        .from("message_rules")
        .select("*, message_templates(body, name)")
        .eq("workspace_id", workspace_id)
        .eq("active", true)
        .in("trigger", ["antes_da_sessao", "apos_sessao"]);

      if (rulesErr || !rules || rules.length === 0) continue;

      for (const rule of rules) {
        const template = (rule as any).message_templates;
        if (!template) continue;

        const offsetMs = offsetToMs(rule.offset_value, rule.offset_unit);

        // 3. Calcular janela de tempo para buscar agendamentos
        let targetTime: Date;
        if (rule.trigger === "antes_da_sessao") {
          // Agendamentos que começam em (now + offset) ± 5min
          targetTime = new Date(now.getTime() + offsetMs);
        } else {
          // apos_sessao: agendamentos que terminaram em (now - offset) ± 5min
          targetTime = new Date(now.getTime() - offsetMs);
        }

        const windowStart = new Date(targetTime.getTime() - windowMs).toISOString();
        const windowEnd = new Date(targetTime.getTime() + windowMs).toISOString();

        const timeField = rule.trigger === "antes_da_sessao" ? "starts_at" : "ends_at";

        const { data: appointments, error: aptsErr } = await supabase
          .from("appointments")
          .select("*, clients(full_name, phone)")
          .eq("workspace_id", workspace_id)
          .gte(timeField, windowStart)
          .lte(timeField, windowEnd)
          .in("status", ["scheduled", "confirmed"]);

        if (aptsErr || !appointments || appointments.length === 0) continue;

        for (const apt of appointments) {
          const client = (apt as any).clients;
          if (!client?.phone) continue; // Pular clientes sem telefone

          // 4. Verificar se já foi enviado para este agendamento + regra
          const { data: existing } = await supabase
            .from("message_logs")
            .select("id")
            .eq("appointment_id", apt.id)
            .eq("rule_id", rule.id)
            .maybeSingle();

          if (existing) continue; // Já enviado, pular

          // 5. Substituir variáveis no template
          const { data: dataStr, hora } = formatDateTime(apt.starts_at);
          const body = substituteVariables(template.body, {
            nome_cliente: client.full_name,
            data_sessao: dataStr,
            hora_sessao: hora,
          });

          // 6. Montar URL da edge function send-whatsapp-message
          const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
          const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

          const sendRes = await fetch(`${supabaseUrl}/functions/v1/send-whatsapp-message`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${serviceKey}`,
            },
            body: JSON.stringify({
              workspace_id,
              phone: client.phone,
              message: body,
              appointment_id: apt.id,
              client_id: client.id ?? apt.client_id,
              template_id: rule.template_id,
              rule_id: rule.id,
            }),
          });

          if (sendRes.ok) {
            totalSent++;
          } else {
            totalErrors++;
            console.error(`Erro ao enviar para ${client.phone}:`, await sendRes.text());
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent: totalSent, errors: totalErrors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("process-message-rules error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
