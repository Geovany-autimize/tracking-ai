import { Clock, Package, Truck, CheckCircle2, AlertCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type ShipmentStatus =
  | 'pending'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'exception';

interface ShipmentStatusInfo {
  label: string;
  badgeClass: string;
  icon: LucideIcon;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
}

const SHIPMENT_STATUS_CONFIG: Record<ShipmentStatus, ShipmentStatusInfo> = {
  pending: {
    label: 'Pendente',
    icon: Clock,
    badgeClass: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30 hover:bg-yellow-500/20',
    variant: 'secondary',
  },
  in_transit: {
    label: 'Em Trânsito',
    icon: Package,
    badgeClass: 'bg-[hsl(199,89%,48%)]/10 text-[hsl(199,89%,48%)] border-[hsl(199,89%,48%)]/30 hover:bg-[hsl(199,89%,48%)]/20',
    variant: 'default',
  },
  out_for_delivery: {
    label: 'Saiu para Entrega',
    icon: Truck,
    badgeClass: 'bg-[hsl(262,52%,58%)]/10 text-[hsl(262,52%,58%)] border-[hsl(262,52%,58%)]/30 hover:bg-[hsl(262,52%,58%)]/20',
    variant: 'default',
  },
  delivered: {
    label: 'Entregue',
    icon: CheckCircle2,
    badgeClass: 'bg-green-500/10 text-green-500 border-green-500/30 hover:bg-green-500/20',
    variant: 'outline',
  },
  exception: {
    label: 'Exceção',
    icon: AlertCircle,
    badgeClass: 'bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/20',
    variant: 'destructive',
  },
};

const STATUS_ALIASES: Record<string, ShipmentStatus> = {
  failed: 'exception',
  failed_attempt: 'exception',
  info_received: 'pending',
  available_for_pickup: 'out_for_delivery',
  expired: 'exception',
};

export function resolveShipmentStatus(status?: string | null): ShipmentStatus {
  if (!status) return 'pending';

  if ((status as ShipmentStatus) in SHIPMENT_STATUS_CONFIG) {
    return status as ShipmentStatus;
  }

  if (status in STATUS_ALIASES) {
    return STATUS_ALIASES[status];
  }

  return 'pending';
}

export function getShipmentStatusInfo(status?: string | null): ShipmentStatusInfo {
  const resolved = resolveShipmentStatus(status);
  return SHIPMENT_STATUS_CONFIG[resolved];
}

export const shipmentStatuses: ShipmentStatus[] = [
  'pending',
  'in_transit',
  'out_for_delivery',
  'delivered',
  'exception',
];
