import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { WhatsAppContextType, WhatsAppStatus, InstanceData } from '@/types/whatsapp';

const WhatsAppContext = createContext<WhatsAppContextType | undefined>(undefined);

const CACHE_DURATION = 60000; // 1 minuto
const WEBHOOK_STATUS_URL = 'https://webhook-n8n.autimize.com.br/webhook/cbdf4e87-e7be-4064-b467-97d1275acc2b';

export function WhatsAppProvider({ children }: { children: React.ReactNode }) {
  const { customer } = useAuth();
  const [status, setStatus] = useState<WhatsAppStatus>('disconnected');
  const [instanceData, setInstanceData] = useState<InstanceData | null>(null);
  const [lastChecked, setLastChecked] = useState<number | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const checkingRef = useRef(false);

  const checkStatus = useCallback(async (force = false) => {
    if (!customer?.id) return;
    
    // Usar cache se não forçado e cache válido
    if (!force && lastChecked && Date.now() - lastChecked < CACHE_DURATION) {
      return;
    }
    
    // Evitar requisições simultâneas
    if (checkingRef.current) return;
    
    checkingRef.current = true;
    setIsChecking(true);
    setErrorMessage(null);

    try {
      const response = await fetch(WEBHOOK_STATUS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: customer.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Falha ao verificar status');
      }

      const data = await response.json();
      
      // Parse correto: data[0]?.data?.[0]
      const responseData = data?.[0]?.data?.[0];
      
      if (responseData) {
        const instanceInfo = {
          id: responseData.id,
          name: responseData.name,
          profileName: responseData.profileName,
          ownerJid: responseData.ownerJid,
          profilePicUrl: responseData.profilePicUrl,
          connectionStatus: responseData.connectionStatus,
        };
        
      // Mapear connectionStatus da API para nosso status interno
      if (responseData.connectionStatus === 'open') {
        setStatus('connected');
        setInstanceData(instanceInfo);
      } else if (responseData.connectionStatus === 'connecting') {
        setStatus('connecting');
        setInstanceData(instanceInfo); // QR Code gerado, aguardando scan
      } else if (responseData.connectionStatus === 'close') {
        // Instância existe mas está desconectada
        setStatus('disconnected');
        setInstanceData(instanceInfo); // Preservar dados para mostrar na UI
      } else {
        // Estado desconhecido ou sem instância
        setStatus('disconnected');
        setInstanceData(null);
      }
      } else {
        setStatus('disconnected');
        setInstanceData(null);
      }
      
      setLastChecked(Date.now());
    } catch (error) {
      console.error('Error checking WhatsApp status:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Erro ao verificar status');
      setStatus('disconnected');
      setInstanceData(null);
    } finally {
      setIsChecking(false);
      checkingRef.current = false;
    }
  }, [customer?.id, lastChecked]);

  // Verificar status ao montar se tem customer
  useEffect(() => {
    if (customer?.id) {
      checkStatus();
    }
  }, [customer?.id]);

  const value: WhatsAppContextType = {
    status,
    instanceData,
    lastChecked,
    isChecking,
    errorMessage,
    checkStatus,
    setStatus,
    setInstanceData,
  };

  return (
    <WhatsAppContext.Provider value={value}>
      {children}
    </WhatsAppContext.Provider>
  );
}

export function useWhatsApp() {
  const context = React.useContext(WhatsAppContext);
  if (context === undefined) {
    throw new Error('useWhatsApp must be used within a WhatsAppProvider');
  }
  return context;
}
