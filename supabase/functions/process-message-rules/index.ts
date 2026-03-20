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
    .replace(/\{\{nome_profissional\}\}/g, vars.nome_profissional ?? "")
    .replace(/\{\{link_pagamento\}\}/g, vars.link_pagamento ?? "");
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
    // 1. Buscar workspaces com WhatsApp conectado via QR Code (whatsapp_instances_qr)
    const { data: qrInstances, error: qrErr } = await supabase
      .from("whatsapp_instances_qr")
      .select("workspace_id, instance_key, status")
      .eq("status", "connected");

    if (qrErr) {
      console.error("[process-message-rules] Error fetching QR instances:", qrErr);
    }

    // Montar mapa de workspaces conectados com instance_name
    const connectedWorkspaces = new Map<string, string>(); // workspace_id -> instance_name

    // QR instances (UazAPI)
    if (qrInstances) {
      for (const inst of qrInstances) {
        if (inst.instance_key) {
          connectedWorkspaces.set(inst.workspace_id, inst.instance_key);
        }
      }
    }

    if (connectedWorkspaces.size === 0) {
      console.log("[process-message-rules] Nenhum workspace com WhatsApp conectado");
      return new Response(JSON.stringify({ message: "Nenhum workspace com WhatsApp conectado", processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[process-message-rules] Found ${connectedWorkspaces.size} connected workspaces`);

    let totalQueued = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    for (const [workspace_id, instanceName] of connectedWorkspaces) {
      // 3. Buscar regras ativas do workspace
      const { data: rules, error: rulesErr } = await supabase
        .from("message_rules")
        .select("*, message_templates(body, name, message_type, payment_link_id, payment_link_override)")
        .eq("workspace_id", workspace_id)
        .eq("active", true)
        .in("trigger", ["antes_da_sessao", "apos_sessao"]);

      if (rulesErr || !rules || rules.length === 0) {
        console.log(`[process-message-rules] No active rules for workspace ${workspace_id}`);
        continue;
      }

      // Fetch workspace name for {{nome_profissional}}
      const { data: wsData } = await supabase
        .from("workspaces")
        .select("name")
        .eq("id", workspace_id)
        .maybeSingle();
      const profissionalName = wsData?.name ?? "";

      console.log(`[process-message-rules] Workspace ${workspace_id}: ${rules.length} active rules`);

      for (const rule of rules) {
        const template = (rule as any).message_templates;
        if (!template) continue;

        const offsetMs = offsetToMs(rule.offset_value, rule.offset_unit);

        // 4. Calcular janela de tempo para buscar agendamentos
        let targetTime: Date;
        if (rule.trigger === "antes_da_sessao") {
          targetTime = new Date(now.getTime() + offsetMs);
        } else {
          targetTime = new Date(now.getTime() - offsetMs);
        }

        const windowStart = new Date(targetTime.getTime() - windowMs).toISOString();
        const windowEnd = new Date(targetTime.getTime() + windowMs).toISOString();

        const timeField = rule.trigger === "antes_da_sessao" ? "starts_at" : "ends_at";

        console.log(`[process-message-rules] Rule "${template.name}" (${rule.trigger}, ${rule.offset_value} ${rule.offset_unit}): checking ${timeField} between ${windowStart} and ${windowEnd}`);

        const { data: appointments, error: aptsErr } = await supabase
          .from("appointments")
          .select("*, clients(id, full_name, phone)")
          .eq("workspace_id", workspace_id)
          .gte(timeField, windowStart)
          .lte(timeField, windowEnd)
          .in("status", ["scheduled", "confirmed"]);

        if (aptsErr) {
          console.error(`[process-message-rules] Error fetching appointments:`, aptsErr);
          continue;
        }

        if (!appointments || appointments.length === 0) {
          console.log(`[process-message-rules] No matching appointments for rule "${template.name}"`);
          continue;
        }

        // Resolve payment link for this template (once per rule)
        let paymentLinkUrl: string | null = null;
        if (template.message_type === "payment_link") {
          if (template.payment_link_override) {
            paymentLinkUrl = template.payment_link_override;
          } else if (template.payment_link_id) {
            const { data: plData } = await supabase
              .from("payment_links")
              .select("external_link, url")
              .eq("id", template.payment_link_id)
              .maybeSingle();
            paymentLinkUrl = plData?.external_link || plData?.url || null;
          }
        }

        console.log(`[process-message-rules] Found ${appointments.length} appointments for rule "${template.name}"`);

        for (const apt of appointments) {
          const client = (apt as any).clients;
          if (!client?.phone) {
            console.log(`[process-message-rules] Skipping appointment ${apt.id}: no phone`);
            totalSkipped++;
            continue;
          }

          // 5. Verificar se já foi enfileirado/enviado para este agendamento + regra
          const { data: existingLog } = await supabase
            .from("message_logs")
            .select("id")
            .eq("appointment_id", apt.id)
            .eq("rule_id", rule.id)
            .maybeSingle();

          if (existingLog) {
            console.log(`[process-message-rules] Already sent for apt ${apt.id} + rule ${rule.id}`);
            totalSkipped++;
            continue;
          }

          // Also check outbox for same appointment + rule combination (via message_text match is fragile, use log check above as primary)
          // The message_logs check above is the primary dedup mechanism

          // 6. Substituir variáveis no template
          const { data: dataStr, hora } = formatDateTime(apt.starts_at);
          const body = substituteVariables(template.body, {
            nome_cliente: client.full_name,
            data_sessao: dataStr,
            hora_sessao: hora,
            nome_profissional: profissionalName,
            link_pagamento: paymentLinkUrl ?? "",
          });

          // 7. Inserir na fila whatsapp_outbox para o worker processar
          const { error: insertErr } = await supabase
            .from("whatsapp_outbox")
            .insert({
              workspace_id,
              to_phone: client.phone,
              message_text: body,
              instance_name: instanceName,
              status: "queued",
              scheduled_for: new Date().toISOString(),
              payment_link: paymentLinkUrl,
            });

          if (insertErr) {
            console.error(`[process-message-rules] Error inserting into outbox:`, insertErr);
            totalErrors++;
            continue;
          }

          // 8. Registrar no message_logs para evitar duplicatas futuras
          await supabase.from("message_logs").insert({
            workspace_id,
            phone: client.phone,
            body,
            status: "queued",
            appointment_id: apt.id,
            client_id: client.id,
            template_id: rule.template_id,
            rule_id: rule.id,
          });

          console.log(`[process-message-rules] Queued message for ${client.full_name} (${client.phone})`);
          totalQueued++;
        }
      }
    }

    console.log(`[process-message-rules] Done: ${totalQueued} queued, ${totalSkipped} skipped, ${totalErrors} errors`);
    return new Response(
      JSON.stringify({ success: true, queued: totalQueued, skipped: totalSkipped, errors: totalErrors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[process-message-rules] Fatal error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
