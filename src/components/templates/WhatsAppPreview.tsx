import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ChevronLeft, MoreVertical, Check } from 'lucide-react';
import { processTemplate, getExampleVariables } from '@/lib/template-processor';
import { useMemo } from 'react';

interface WhatsAppPreviewProps {
  message: string;
}

export function WhatsAppPreview({ message }: WhatsAppPreviewProps) {
  const previewMessage = useMemo(() => {
    const exampleVars = getExampleVariables();
    return processTemplate(message, exampleVars);
  }, [message]);

  const currentTime = new Date().toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader className="p-0">
        <div className="bg-[#075E54] text-white p-3 flex items-center gap-3">
          <ChevronLeft className="h-5 w-5" />
          <div className="flex-1">
            <h3 className="font-medium">TrackingAI</h3>
          </div>
          <MoreVertical className="h-5 w-5" />
        </div>
      </CardHeader>
      <CardContent className="p-4 bg-[#ECE5DD] dark:bg-[#0B141A] min-h-[500px] relative">
        {/* Date Divider */}
        <div className="flex justify-center mb-4">
          <div className="bg-white/90 dark:bg-gray-800/90 px-3 py-1 rounded-lg text-xs">
            Hoje
          </div>
        </div>

        {/* Message Bubble */}
        {previewMessage ? (
          <div className="flex justify-start animate-in fade-in slide-in-from-left-2 duration-300">
            <div className="max-w-[80%]">
              <div className="bg-white dark:bg-[#1F2C34] rounded-lg p-3 shadow-md">
                <p className="text-sm whitespace-pre-wrap break-words">
                  {previewMessage}
                </p>
                <div className="flex items-center justify-end gap-1 mt-1">
                  <span className="text-[10px] text-muted-foreground">
                    {currentTime}
                  </span>
                  <Check className="h-3 w-3 text-blue-500" />
                  <Check className="h-3 w-3 text-blue-500 -ml-2" />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground text-center">
              Digite sua mensagem para<br />ver o preview em tempo real
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
