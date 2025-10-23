export type WhatsAppStatus = 'connected' | 'disconnected' | 'connecting' | 'checking';

export interface InstanceData {
  id?: string;
  name?: string;
  profileName?: string;
  ownerJid?: string;
  profilePicUrl?: string;
  connectionStatus?: string;
}

export interface WhatsAppContextType {
  status: WhatsAppStatus;
  instanceData: InstanceData | null;
  lastChecked: number | null;
  isChecking: boolean;
  errorMessage: string | null;
  checkStatus: (force?: boolean) => Promise<void>;
  setStatus: (status: WhatsAppStatus) => void;
  setInstanceData: (data: InstanceData | null) => void;
}
