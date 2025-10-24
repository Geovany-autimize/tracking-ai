const TRACKING_WEBHOOK_URL = 'https://webhook-n8n.autimize.com.br/webhook/be6af83d-e1f1-4fdf-b836-928e834c1548';
const REQUEST_TIMEOUT = 10000; // 10 segundos

export interface TrackingAPIRequest {
  user_id: string;
  tracking_code: string;
  action: 'new_track' | 'atualization';
  tracker_id?: string;
}

// Interfaces para dados da API externa
export interface TrackingEvent {
  eventId: string;
  trackingNumber: string;
  eventTrackingNumber: string;
  status: string;
  occurrenceDatetime: string;
  datetime: string;
  hasNoTime: boolean;
  utcOffset: string | null;
  location: string;
  sourceCode: string;
  courierCode: string;
  statusCode: string | null;
  statusCategory: string | null;
  statusMilestone: string;
  order?: number | null;
}

export interface TrackerData {
  trackerId: string;
  trackingNumber: string;
  shipmentReference: string | null;
  courierCode: string[];
  clientTrackerId: string | null;
  isSubscribed: boolean;
  isTracked: boolean;
  createdAt: string;
}

export interface ShipmentData {
  shipmentId: string;
  statusCode: string;
  statusCategory: string;
  statusMilestone: string;
  originCountryCode: string | null;
  destinationCountryCode: string | null;
  delivery: {
    estimatedDeliveryDate: string | null;
    service: string | null;
    signedBy: string | null;
  };
  trackingNumbers: Array<{ tn: string }>;
  recipient: {
    name: string | null;
    address: string | null;
    postCode: string | null;
    city: string | null;
    subdivision: string | null;
  };
}

export interface TrackingStatistics {
  timestamps: {
    infoReceivedDatetime: string | null;
    inTransitDatetime: string | null;
    outForDeliveryDatetime: string | null;
    failedAttemptDatetime: string | null;
    availableForPickupDatetime: string | null;
    exceptionDatetime: string | null;
    deliveredDatetime: string | null;
  };
}

export interface TrackingDataItem {
  tracker: TrackerData;
  shipment: ShipmentData;
  events: TrackingEvent[];
  statistics: TrackingStatistics;
}

export interface TrackingAPIResponse {
  success: boolean;
  message?: string;
  data?: {
    trackings?: TrackingDataItem[];
  };
}

export class TrackingAPIError extends Error {
  constructor(message: string, public originalError?: any) {
    super(message);
    this.name = 'TrackingAPIError';
  }
}

/**
 * Envia dados de rastreio para a API externa
 * @param userId - ID do usuário autenticado
 * @param trackingCode - Código de rastreio
 * @param action - Tipo de ação: novo rastreio ou atualização
 * @param trackerId - ID do tracker (opcional)
 * @param retryCount - Tentativas de retry (máx 1)
 */
export async function sendToTrackingAPI(
  userId: string,
  trackingCode: string,
  action: 'new_track' | 'atualization',
  trackerId?: string,
  retryCount = 0
): Promise<TrackingAPIResponse> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    const payload: TrackingAPIRequest = {
      user_id: userId,
      tracking_code: trackingCode,
      action,
    };

    if (trackerId) {
      payload.tracker_id = trackerId;
    }

    const response = await fetch(TRACKING_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      success: true,
      data,
    };

  } catch (error) {
    console.error('[Tracking API Error]', {
      userId,
      trackingCode,
      action,
      error,
    });

    // Retry uma vez se for erro de rede
    if (retryCount === 0 && error instanceof TypeError) {
      console.log('[Tracking API] Retrying...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      return sendToTrackingAPI(userId, trackingCode, action, trackerId, 1);
    }

    throw new TrackingAPIError(
      'Falha ao comunicar com a API de rastreio',
      error
    );
  }
}

/**
 * Helper: Verifica se erro é de timeout
 */
export function isTimeoutError(error: any): boolean {
  return error.name === 'AbortError';
}

/**
 * Helper: Extrai dados de rastreio da resposta da API
 */
export function parseTrackingResponse(response: TrackingAPIResponse | any): TrackingDataItem | null {
  // Se a resposta for um array (formato do webhook), pega o primeiro item
  const data = Array.isArray(response) ? response[0] : response;
  
  if (!data?.data?.trackings || data.data.trackings.length === 0) {
    return null;
  }
  return data.data.trackings[0];
}

/**
 * Helper: Mapeia status da API para status interno
 */
export function mapApiStatusToInternal(statusMilestone: string): string {
  const statusMap: Record<string, string> = {
    'in_transit': 'in_transit',
    'out_for_delivery': 'out_for_delivery',
    'delivered': 'delivered',
    'exception': 'exception',
    'pending': 'pending',
  };
  return statusMap[statusMilestone] || 'pending';
}
