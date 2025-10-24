const TRACKING_WEBHOOK_URL = 'https://webhook-n8n.autimize.com.br/webhook/be6af83d-e1f1-4fdf-b836-928e834c1548';
const REQUEST_TIMEOUT = 10000; // 10 segundos

export interface TrackingAPIRequest {
  user_id: string;
  tracking_code: string;
  action: 'new_track' | 'atualization';
}

export interface TrackingAPIResponse {
  success: boolean;
  message?: string;
  data?: any;
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
 * @param retryCount - Tentativas de retry (máx 1)
 */
export async function sendToTrackingAPI(
  userId: string,
  trackingCode: string,
  action: 'new_track' | 'atualization',
  retryCount = 0
): Promise<TrackingAPIResponse> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    const response = await fetch(TRACKING_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        tracking_code: trackingCode,
        action,
      } as TrackingAPIRequest),
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
      return sendToTrackingAPI(userId, trackingCode, action, 1);
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
