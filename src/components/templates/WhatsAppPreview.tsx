import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Check } from 'lucide-react';
import { processTemplate, getExampleVariables } from '@/lib/template-processor';
import { useMemo } from 'react';
import { format } from 'date-fns';

interface WhatsAppPreviewProps {
  message: string;
}

export function WhatsAppPreview({ message }: WhatsAppPreviewProps) {
  const previewMessage = useMemo(() => {
    const exampleVars = getExampleVariables();
    return processTemplate(message, exampleVars);
  }, [message]);

  // Safe text rendering - formats are handled via CSS classes
  const formatWhatsAppText = (text: string) => {
    return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|__[^_]+__|_[^_]+_)/g).map((part, index) => {
      // Bold: **text** or *text*
      if (part.match(/^\*\*([^*]+)\*\*$/)) {
        return <strong key={index}>{part.slice(2, -2)}</strong>;
      }
      if (part.match(/^\*([^*]+)\*$/)) {
        return <strong key={index}>{part.slice(1, -1)}</strong>;
      }
      // Italic: __text__ or _text_
      if (part.match(/^__([^_]+)__$/)) {
        return <em key={index}>{part.slice(2, -2)}</em>;
      }
      if (part.match(/^_([^_]+)_$/)) {
        return <em key={index}>{part.slice(1, -1)}</em>;
      }
      return part;
    });
  };

  return (
    <Card className="w-full max-w-md mx-auto overflow-hidden border-0 shadow-lg">
      {/* WhatsApp Header */}
      <div className="bg-[#008069] p-3 flex items-center gap-3">
        <Avatar className="h-10 w-10 border-2 border-white/20">
          <AvatarFallback className="bg-white/10 text-white font-semibold">
            CL
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-white">João Silva</h4>
          <p className="text-xs text-white/80">online</p>
        </div>
      </div>

      {/* Messages Area */}
      <div className="p-4 min-h-[400px] bg-[#efeae2] bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iYSIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVHJhbnNmb3JtPSJyb3RhdGUoNDUpIj48cGF0aCBkPSJNLTEwIDMwaDYwTS0xMCAxMGg2MCIgc3Ryb2tlPSIjZDlkNGNlIiBzdHJva2Utd2lkdGg9IjAuNSIgZmlsbD0ibm9uZSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjQwMCIgaGVpZ2h0PSI0MDAiIGZpbGw9InVybCgjYSkiLz48L3N2Zz4=')] bg-repeat">
        {previewMessage ? (
          <div className="flex justify-end">
            <div className="relative bg-[#d9fdd3] rounded-lg px-3 py-2 max-w-[85%] shadow-sm">
              <div className="text-[14.2px] text-[#111b21] whitespace-pre-wrap break-words leading-[1.4]">
                {formatWhatsAppText(previewMessage)}
              </div>
              <div className="flex items-center justify-end gap-1 mt-1">
                <span className="text-[11px] text-[#667781]">
                  {format(new Date(), 'HH:mm')}
                </span>
                <Check className="h-[14px] w-[14px] text-[#53bdeb] -ml-0.5" />
                <Check className="h-[14px] w-[14px] text-[#53bdeb] -ml-2.5" />
              </div>
              {/* Message tail */}
              <div className="absolute -right-2 bottom-0 w-0 h-0 border-l-[10px] border-l-[#d9fdd3] border-b-[10px] border-b-transparent"></div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-[#667781] text-sm">
            Digite uma mensagem para ver o preview
          </div>
        )}
      </div>
    </Card>
  );
}
