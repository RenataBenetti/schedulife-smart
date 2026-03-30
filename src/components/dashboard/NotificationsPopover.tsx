import { Bell, Check, Clock, CreditCard, Calendar } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications, useUnreadCount, useMarkAllRead, useMarkRead } from "@/hooks/use-notifications";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const typeIcons: Record<string, typeof Bell> = {
  appointment_reminder: Calendar,
  payment_pending: CreditCard,
  daily_summary: Clock,
};

interface Props {
  workspaceId?: string;
  onNavigate?: (tab: string) => void;
}

export const NotificationsPopover = ({ workspaceId, onNavigate }: Props) => {
  const { data: notifications } = useNotifications(workspaceId);
  const unread = useUnreadCount(workspaceId);
  const markAll = useMarkAllRead(workspaceId);
  const markOne = useMarkRead();

  const handleClick = (n: { id: string; type: string; read: boolean }) => {
    if (!n.read) markOne.mutate(n.id);
    if (n.type === "appointment_reminder" || n.type === "daily_summary") onNavigate?.("agendamentos");
    if (n.type === "payment_pending") onNavigate?.("pagamentos");
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative h-8 w-8 md:h-9 md:w-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-muted">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h4 className="font-semibold text-sm text-foreground">Notificações</h4>
          {unread > 0 && (
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => markAll.mutate()}>
              <Check className="h-3 w-3 mr-1" /> Marcar todas
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {(!notifications || notifications.length === 0) ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma notificação
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((n) => {
                const Icon = typeIcons[n.type] || Bell;
                return (
                  <button
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-muted/50 transition-colors ${!n.read ? "bg-primary/5" : ""}`}
                  >
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${!n.read ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-tight ${!n.read ? "font-semibold text-foreground" : "text-foreground"}`}>
                        {n.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                      </p>
                    </div>
                    {!n.read && <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />}
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
