import {
  differenceInHours,
  eachDayOfInterval,
  endOfDay,
  format,
  isSameDay,
  isWithinInterval,
  max as maxDate,
  startOfDay,
  subDays,
  subHours,
} from 'date-fns';

type Nullable<T> = T | null | undefined;

export type DashboardRangeKey = '7d' | '30d' | '90d';

export interface DashboardRange {
  key: DashboardRangeKey;
  label: string;
  start: Date;
  end: Date;
  compareStart: Date;
  compareEnd: Date;
  days: number;
}

export interface DashboardAlert {
  id: string;
  title: string;
  description: string;
  type: 'stuck' | 'exception' | 'slow';
  severity: 'low' | 'medium' | 'high';
  shipmentId: string;
  status: string;
  lastActivity: Date | null;
}

export interface DashboardInsight {
  title: string;
  description: string;
  actionLabel?: string;
  route?: string;
}

export interface DashboardTrendPoint {
  date: string;
  created: number;
  delivered: number;
  exceptions: number;
}

export interface DashboardStatusSlice {
  status: string;
  count: number;
  percentage: number;
}

export interface DashboardCourierPerformance {
  courier: string;
  deliveredCount: number;
  averageDeliveryDays: number | null;
  exceptionRate: number | null;
  stuckCount: number;
}

export interface DashboardAutomationSummary {
  autoTrackingRate: number | null;
  lastTrackingUpdate: Date | null;
  shipmentsWithAutoTracking: number;
  totalShipments: number;
}

export interface DashboardOverviewMetrics {
  deliveredCount: number;
  deliveredDelta: number | null;
  averageDeliveryDays: number | null;
  averageDeliveryDelta: number | null;
  exceptionRate: number | null;
  exceptionRateDelta: number | null;
  stuckShipments: number;
  stuckThresholdHours: number;
}

export interface DashboardMetrics {
  overview: DashboardOverviewMetrics;
  trends: DashboardTrendPoint[];
  statusDistribution: DashboardStatusSlice[];
  courierPerformance: DashboardCourierPerformance[];
  alerts: DashboardAlert[];
  insights: DashboardInsight[];
  automation: DashboardAutomationSummary;
}

export interface DashboardShipmentRecord {
  id: string;
  status: string;
  created_at: string;
  last_update?: string | null;
  auto_tracking?: boolean | null;
  tracking_events?: any[] | string | null;
  shipment_data?: Record<string, any> | null;
}

interface NormalizedEvent {
  milestone: string;
  status: string | null;
  at: Date;
  courier: string;
  location?: string | null;
}

interface NormalizedShipment {
  id: string;
  status: string;
  createdAt: Date;
  lastUpdateAt: Date | null;
  autoTracking: boolean;
  events: NormalizedEvent[];
  deliveredAt: Date | null;
  exceptionAt: Date | null;
  firstEventAt: Date | null;
  lastEventAt: Date | null;
  lastActivityAt: Date;
  courier: string;
  hasException: boolean;
  deliveryDurationDays: number | null;
}

const RANGE_CONFIG: Record<DashboardRangeKey, { days: number; label: string }> = {
  '7d': { days: 7, label: 'Últimos 7 dias' },
  '30d': { days: 30, label: 'Últimos 30 dias' },
  '90d': { days: 90, label: 'Últimos 90 dias' },
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  info_received: 'Info Recebida',
  in_transit: 'Em Trânsito',
  out_for_delivery: 'Saiu para Entrega',
  delivered: 'Entregue',
  exception: 'Exceção',
  failed_attempt: 'Tentativa Falha',
  available_for_pickup: 'Disponível para Retirada',
};

const STUCK_THRESHOLD_HOURS = 72;

export function getDashboardRange(key: DashboardRangeKey, now = new Date()): DashboardRange {
  const config = RANGE_CONFIG[key];
  if (!config) {
    throw new Error(`Unsupported range key: ${key}`);
  }

  const end = endOfDay(now);
  const start = startOfDay(subDays(end, config.days - 1));

  const compareEnd = endOfDay(subDays(start, 1));
  const compareStart = startOfDay(subDays(compareEnd, config.days - 1));

  return {
    key,
    label: config.label,
    start,
    end,
    compareStart,
    compareEnd,
    days: config.days,
  };
}

function safeParseDate(input: Nullable<string | Date>): Date | null {
  if (!input) return null;
  if (input instanceof Date) {
    return Number.isNaN(input.getTime()) ? null : input;
  }

  const parsed = new Date(input);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeTrackingEvents(rawEvents: Nullable<any[] | string>): NormalizedEvent[] {
  let eventsArray: any[] = [];

  if (!rawEvents) {
    return eventsArray;
  }

  if (typeof rawEvents === 'string') {
    try {
      const parsed = JSON.parse(rawEvents);
      if (Array.isArray(parsed)) {
        eventsArray = parsed;
      }
    } catch (error) {
      console.warn('[dashboard-metrics] Failed to parse tracking_events JSON', error);
      return eventsArray;
    }
  } else if (Array.isArray(rawEvents)) {
    eventsArray = rawEvents;
  }

  return eventsArray
    .map((event) => {
      const at = safeParseDate(event?.occurrenceDatetime || event?.datetime);
      if (!at) return null;

      const milestone = String(event?.statusMilestone || event?.status_code || '').toLowerCase();
      const status = event?.status ? String(event.status) : null;
      const courier =
        (event?.courierName && String(event.courierName)) ||
        (event?.courier_code && String(event.courier_code)) ||
        (event?.courierCode && String(event.courierCode)) ||
        '';

      return {
        milestone,
        status,
        at,
        courier,
        location: event?.location ?? event?.city ?? null,
      } satisfies NormalizedEvent;
    })
    .filter(Boolean) as NormalizedEvent[];
}

function extractDeliveredAt(
  events: NormalizedEvent[],
  shipmentData: Record<string, any> | null | undefined,
): Date | null {
  const eventDelivered = events.find((event) => event.milestone === 'delivered');
  if (eventDelivered) {
    return eventDelivered.at;
  }

  const fromDelivery = safeParseDate(shipmentData?.delivery?.deliveredDatetime);
  if (fromDelivery) return fromDelivery;

  const fromStats = safeParseDate(shipmentData?.statistics?.timestamps?.deliveredDatetime);
  if (fromStats) return fromStats;

  return null;
}

function extractExceptionAt(events: NormalizedEvent[]): Date | null {
  const exceptionEvent = events.find((event) => event.milestone === 'exception' || event.milestone === 'failed_attempt');
  return exceptionEvent?.at ?? null;
}

function pickCourier(events: NormalizedEvent[], shipmentData: Record<string, any> | null | undefined): string {
  const fromEvent = events.find((event) => event.courier.trim().length > 0)?.courier;
  if (fromEvent && fromEvent.trim().length > 0) {
    return fromEvent.trim();
  }

  const courierArray: unknown = shipmentData?.courierCode || shipmentData?.courier_code;
  if (Array.isArray(courierArray) && courierArray.length > 0) {
    return String(courierArray[0]);
  }

  if (typeof courierArray === 'string' && courierArray.trim().length > 0) {
    return courierArray.trim();
  }

  const trackerCourier = shipmentData?.tracker?.courierCode;
  if (Array.isArray(trackerCourier) && trackerCourier.length > 0) {
    return String(trackerCourier[0]);
  }

  return 'Transportadora não identificada';
}

export function normalizeShipments(records: DashboardShipmentRecord[]): NormalizedShipment[] {
  return records
    .map((record) => {
      const createdAt = safeParseDate(record.created_at);
      if (!createdAt) return null;

      const events = normalizeTrackingEvents(record.tracking_events);
      events.sort((a, b) => a.at.getTime() - b.at.getTime());

      const deliveredAt = extractDeliveredAt(events, record.shipment_data);
      const exceptionAt = extractExceptionAt(events);

      const firstEventAt = events.length > 0 ? events[0].at : null;
      const lastEventAt = events.length > 0 ? events[events.length - 1].at : null;
      const lastUpdateAt = safeParseDate(record.last_update);
      const lastActivityAt = maxDate([
        lastEventAt,
        lastUpdateAt,
        createdAt,
      ].filter(Boolean) as Date[]);

      const courier = pickCourier(events, record.shipment_data);

      const hasException =
        record.status === 'exception' ||
        events.some((event) => event.milestone === 'exception' || event.milestone === 'failed_attempt');

      return {
        id: record.id,
        status: record.status || 'pending',
        createdAt,
        lastUpdateAt,
        autoTracking: Boolean(record.auto_tracking),
        events,
        deliveredAt,
        exceptionAt,
        firstEventAt,
        lastEventAt,
        lastActivityAt,
        courier,
        hasException,
        deliveryDurationDays: deliveredAt
          ? (deliveredAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
          : null,
      } satisfies NormalizedShipment;
    })
    .filter(Boolean) as NormalizedShipment[];
}

function isInRange(date: Nullable<Date>, start: Date, end: Date): boolean {
  if (!date) return false;
  return isWithinInterval(date, { start, end });
}

function percentChange(previous: number | null, current: number | null): number | null {
  if (previous === null || previous === 0 || current === null) {
    return null;
  }
  return ((current - previous) / previous) * 100;
}

function percentImprovement(previous: number | null, current: number | null): number | null {
  if (previous === null || previous === 0 || current === null) {
    return null;
  }
  return ((previous - current) / previous) * 100;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  const sum = values.reduce((acc, value) => acc + value, 0);
  return sum / values.length;
}

function computePercentile(values: number[], percentile: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.round((percentile / 100) * (sorted.length - 1))));
  return sorted[index];
}

function formatStatus(status: string): string {
  return STATUS_LABELS[status] || status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function buildDashboardMetrics(records: DashboardShipmentRecord[], range: DashboardRange): DashboardMetrics {
  const normalized = normalizeShipments(records);
  const now = new Date();

  const currentDelivered = normalized.filter((shipment) => isInRange(shipment.deliveredAt, range.start, range.end));
  const previousDelivered = normalized.filter((shipment) =>
    isInRange(shipment.deliveredAt, range.compareStart, range.compareEnd),
  );

  const averageDeliveryCurrent = average(
    currentDelivered
      .map((shipment) => shipment.deliveryDurationDays)
      .filter((value): value is number => value !== null && Number.isFinite(value)),
  );

  const averageDeliveryPrevious = average(
    previousDelivered
      .map((shipment) => shipment.deliveryDurationDays)
      .filter((value): value is number => value !== null && Number.isFinite(value)),
  );

  const currentCreated = normalized.filter((shipment) => isInRange(shipment.createdAt, range.start, range.end));
  const previousCreated = normalized.filter((shipment) =>
    isInRange(shipment.createdAt, range.compareStart, range.compareEnd),
  );

  const currentExceptions = currentCreated.filter((shipment) => shipment.hasException);
  const previousExceptions = previousCreated.filter((shipment) => shipment.hasException);

  const currentExceptionRate =
    currentCreated.length > 0 ? currentExceptions.length / currentCreated.length : null;
  const previousExceptionRate =
    previousCreated.length > 0 ? previousExceptions.length / previousCreated.length : null;

  const stuckThresholdDate = subHours(now, STUCK_THRESHOLD_HOURS);
  const stuckShipments = normalized.filter(
    (shipment) =>
      !shipment.deliveredAt &&
      shipment.lastActivityAt &&
      shipment.lastActivityAt < stuckThresholdDate &&
      differenceInHours(now, shipment.lastActivityAt) >= STUCK_THRESHOLD_HOURS,
  );

  const daysInterval = eachDayOfInterval({ start: range.start, end: range.end });
  const trends: DashboardTrendPoint[] = daysInterval.map((day) => {
    const created = normalized.filter((shipment) => isSameDay(shipment.createdAt, day)).length;
    const delivered = normalized.filter((shipment) => isSameDay(shipment.deliveredAt, day)).length;
    const exceptions = normalized.filter((shipment) => isSameDay(shipment.exceptionAt, day)).length;
    return {
      date: format(day, 'yyyy-MM-dd'),
      created,
      delivered,
      exceptions,
    };
  });

  const totalStatuses = new Map<string, number>();
  normalized.forEach((shipment) => {
    const status = shipment.status || 'unknown';
    totalStatuses.set(status, (totalStatuses.get(status) ?? 0) + 1);
  });

  const totalShipments = normalized.length || 1;
  const statusDistribution: DashboardStatusSlice[] = Array.from(totalStatuses.entries())
    .map(([status, count]) => ({
      status,
      count,
      percentage: count / totalShipments,
    }))
    .sort((a, b) => b.count - a.count);

  const courierStats = new Map<
    string,
    {
      courier: string;
      deliveredCount: number;
      durations: number[];
      exceptionCount: number;
      totalCount: number;
      stuckCount: number;
    }
  >();

  normalized.forEach((shipment) => {
    const courier = shipment.courier || 'Transportadora não identificada';
    const entry =
      courierStats.get(courier) ??
      {
        courier,
        deliveredCount: 0,
        durations: [],
        exceptionCount: 0,
        totalCount: 0,
        stuckCount: 0,
      };

    const relevantForPeriod =
      isInRange(shipment.createdAt, range.start, range.end) ||
      isInRange(shipment.deliveredAt, range.start, range.end);

    if (relevantForPeriod) {
      entry.totalCount += 1;
      if (shipment.hasException) {
        entry.exceptionCount += 1;
      }
      if (shipment.deliveredAt && shipment.deliveryDurationDays !== null) {
        entry.deliveredCount += 1;
        entry.durations.push(shipment.deliveryDurationDays);
      }
      if (
        !shipment.deliveredAt &&
        shipment.lastActivityAt &&
        shipment.lastActivityAt < stuckThresholdDate
      ) {
        entry.stuckCount += 1;
      }
    }

    courierStats.set(courier, entry);
  });

  const courierPerformance: DashboardCourierPerformance[] = Array.from(courierStats.values())
    .filter((entry) => entry.totalCount > 0)
    .map((entry) => ({
      courier: entry.courier,
      deliveredCount: entry.deliveredCount,
      averageDeliveryDays: entry.durations.length > 0 ? average(entry.durations) : null,
      exceptionRate: entry.totalCount > 0 ? entry.exceptionCount / entry.totalCount : null,
      stuckCount: entry.stuckCount,
    }))
    .sort((a, b) => b.deliveredCount - a.deliveredCount);

  const deliveredDurations = currentDelivered
    .map((shipment) => shipment.deliveryDurationDays)
    .filter((value): value is number => value !== null && Number.isFinite(value));

  const slowDeliveryThreshold = computePercentile(deliveredDurations, 90);

  const alerts: DashboardAlert[] = [];

  stuckShipments
    .sort((a, b) => a.lastActivityAt.getTime() - b.lastActivityAt.getTime())
    .slice(0, 5)
    .forEach((shipment) => {
      alerts.push({
        id: `${shipment.id}-stuck`,
        title: `Rastreio sem atualização há ${differenceInHours(now, shipment.lastActivityAt)}h`,
        description: `Status atual: ${formatStatus(shipment.status)}`,
        type: 'stuck',
        severity: 'high',
        shipmentId: shipment.id,
        status: shipment.status,
        lastActivity: shipment.lastActivityAt,
      });
    });

  normalized
    .filter(
      (shipment) =>
        shipment.hasException &&
        (isInRange(shipment.lastActivityAt, range.start, range.end) ||
          isInRange(shipment.exceptionAt, range.start, range.end)),
    )
    .slice(0, 5)
    .forEach((shipment) => {
      alerts.push({
        id: `${shipment.id}-exception`,
        title: 'Rastreio em exceção',
        description: `Atualizado por último em ${format(shipment.lastActivityAt, 'dd/MM HH:mm')}`,
        type: 'exception',
        severity: 'medium',
        shipmentId: shipment.id,
        status: shipment.status,
        lastActivity: shipment.lastActivityAt,
      });
    });

  if (slowDeliveryThreshold !== null) {
    currentDelivered
      .filter(
        (shipment) =>
          shipment.deliveryDurationDays !== null &&
          shipment.deliveryDurationDays > slowDeliveryThreshold &&
          shipment.deliveredAt &&
          isInRange(shipment.deliveredAt, range.start, range.end),
      )
      .slice(0, 5)
      .forEach((shipment) => {
        alerts.push({
          id: `${shipment.id}-slow`,
          title: 'Entrega acima do tempo típico',
          description: `Demorou ${shipment.deliveryDurationDays?.toFixed(1)} dias para entregar`,
          type: 'slow',
          severity: 'low',
          shipmentId: shipment.id,
          status: shipment.status,
          lastActivity: shipment.deliveredAt,
        });
      });
  }

  const automation: DashboardAutomationSummary = {
    autoTrackingRate:
      normalized.length > 0
        ? normalized.filter((shipment) => shipment.autoTracking).length / normalized.length
        : null,
    lastTrackingUpdate: normalized.reduce<Date | null>((latest, shipment) => {
      if (!latest) return shipment.lastActivityAt;
      return shipment.lastActivityAt > latest ? shipment.lastActivityAt : latest;
    }, null),
    shipmentsWithAutoTracking: normalized.filter((shipment) => shipment.autoTracking).length,
    totalShipments: normalized.length,
  };

  const insights: DashboardInsight[] = [];

  if (automation.autoTrackingRate !== null && automation.autoTrackingRate < 0.75) {
    insights.push({
      title: 'Ative mais rastreamento automático',
      description: `Apenas ${(automation.autoTrackingRate * 100).toFixed(
        1,
      )}% dos rastreios usam auto-tracking. Considere habilitar para reduzir esforço manual.`,
      actionLabel: 'Gerenciar auto-tracking',
      route: '/dashboard/settings',
    });
  }

  const bestCourier = courierPerformance.find((entry) => entry.averageDeliveryDays !== null);
  const worstCourier = [...courierPerformance]
    .filter((entry) => entry.averageDeliveryDays !== null)
    .sort((a, b) => (b.averageDeliveryDays ?? 0) - (a.averageDeliveryDays ?? 0))[0];

  if (
    bestCourier &&
    worstCourier &&
    worstCourier.averageDeliveryDays !== null &&
    bestCourier.averageDeliveryDays !== null &&
    worstCourier.averageDeliveryDays - bestCourier.averageDeliveryDays > 1
  ) {
    insights.push({
      title: `Transporte ${bestCourier.courier} é ${(
        worstCourier.averageDeliveryDays - bestCourier.averageDeliveryDays
      ).toFixed(1)} dia(s) mais rápido`,
      description: `Realoque parte da carga da ${worstCourier.courier} para ${bestCourier.courier} para melhorar o tempo de entrega.`,
      actionLabel: 'Ver performance por transportadora',
      route: '/dashboard/insights',
    });
  }

  if (currentExceptionRate !== null && currentExceptionRate > 0.1) {
    insights.push({
      title: 'Taxa de exceções alta',
      description: `Cerca de ${(currentExceptionRate * 100).toFixed(
        1,
      )}% dos rastreios tiveram problema no período. Verifique os alertas e ajuste fluxos preventivos.`,
      actionLabel: 'Abrir alertas',
      route: '/dashboard/shipments',
    });
  }

  if (insights.length === 0 && currentDelivered.length > previousDelivered.length) {
    insights.push({
      title: 'Volume entregue em alta',
      description: `Você entregou ${
        currentDelivered.length - previousDelivered.length
      } rastreios a mais que no período anterior. Mantenha o ritmo com follow-up automático.`,
    });
  }

  return {
    overview: {
      deliveredCount: currentDelivered.length,
      deliveredDelta: percentChange(previousDelivered.length, currentDelivered.length),
      averageDeliveryDays: averageDeliveryCurrent,
      averageDeliveryDelta: percentImprovement(averageDeliveryPrevious, averageDeliveryCurrent),
      exceptionRate: currentExceptionRate,
      exceptionRateDelta: percentImprovement(previousExceptionRate, currentExceptionRate),
      stuckShipments: stuckShipments.length,
      stuckThresholdHours: STUCK_THRESHOLD_HOURS,
    },
    trends,
    statusDistribution: statusDistribution.map((slice) => ({
      ...slice,
      status: formatStatus(slice.status),
    })),
    courierPerformance,
    alerts,
    insights,
    automation,
  };
}

export function getEarliestRequiredDate(range: DashboardRange): Date {
  return startOfDay(range.compareStart < range.start ? range.compareStart : range.start);
}

export function formatPercent(value: number | null, fractionDigits = 1): string {
  if (value === null || !Number.isFinite(value)) {
    return '—';
  }
  return `${(value * 100).toFixed(fractionDigits)}%`;
}

export function formatDays(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return '—';
  }
  if (value < 1) {
    const hours = value * 24;
    return `${hours.toFixed(1)} h`;
  }
  return `${value.toFixed(1)} d`;
}
