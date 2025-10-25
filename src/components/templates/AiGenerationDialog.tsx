import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, RefreshCw } from "lucide-react";
import { WhatsAppPreview } from "./WhatsAppPreview";
import { useAiTemplateGeneration } from "@/hooks/use-ai-template-generation";
import { processTemplate } from "@/lib/template-processor";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";

interface AiGenerationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (message: string, suggestedName: string) => void;
  trigger?: string;
}

const TRIGGER_OPTIONS = [
  { value: 'info_received', label: '📦 Informação Recebida', description: 'Primeira notificação quando pedido é registrado' },
  { value: 'in_transit', label: '🚚 Em Trânsito', description: 'Pedido está a caminho' },
  { value: 'out_for_delivery', label: '📍 Saiu para Entrega', description: 'Pedido está com o entregador' },
  { value: 'delivered', label: '✅ Entregue', description: 'Pedido foi entregue com sucesso' },
  { value: 'failed_attempt', label: '⚠️ Tentativa Falhou', description: 'Entrega não foi realizada' },
  { value: 'available_for_pickup', label: '📮 Disponível para Retirada', description: 'Pedido pode ser retirado' },
  { value: 'exception', label: '❌ Exceção', description: 'Problema no envio' },
  { value: 'expired', label: '⏰ Expirado', description: 'Prazo de retirada expirou' },
  { value: 'pending', label: '⏳ Pendente', description: 'Aguardando mais informações' }
];

export function AiGenerationDialog({ open, onOpenChange, onGenerate, trigger }: AiGenerationDialogProps) {
  const [selectedTrigger, setSelectedTrigger] = useState(trigger || 'in_transit');
  const [tone, setTone] = useState<'formal' | 'casual' | 'friendly'>('friendly');
  const { generate, isGenerating, generatedData } = useAiTemplateGeneration();

  const handleGenerate = () => {
    if (!selectedTrigger) {
      toast.error('Selecione o tipo de template');
      return;
    }

    generate({
      trigger: selectedTrigger,
      tone
    });
  };

  const handleRegenerate = () => {
    handleGenerate();
  };

  const handleUseMessage = () => {
    if (generatedData) {
      onGenerate(generatedData.message, generatedData.suggestedName);
      // Reset state
      setSelectedTrigger(trigger || 'in_transit');
      toast.success('Mensagem inserida com sucesso!', {
        description: 'Você pode editá-la antes de salvar'
      });
    }
  };

  const handleCancel = () => {
    setSelectedTrigger(trigger || 'in_transit');
    onOpenChange(false);
  };

  const toneLabels = {
    'formal': 'Profissional',
    'casual': 'Casual',
    'friendly': 'Amigável'
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Gerar Mensagem com IA
          </DialogTitle>
          <DialogDescription>
            Descreva o que você quer comunicar e a IA criará uma mensagem profissional para você
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Select de Tipo de Template */}
          <div className="space-y-2">
            <Label htmlFor="trigger">
              Tipo de Template <span className="text-destructive">*</span>
            </Label>
            <Select value={selectedTrigger} onValueChange={setSelectedTrigger} disabled={isGenerating}>
              <SelectTrigger id="trigger">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRIGGER_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex flex-col">
                      <span>{option.label}</span>
                      <span className="text-xs text-muted-foreground">{option.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              A IA criará uma mensagem otimizada para este tipo de notificação
            </p>
          </div>

          {/* Select de Tom */}
          <div className="space-y-2">
            <Label htmlFor="tone">Tom da Mensagem</Label>
            <Select value={tone} onValueChange={(value: any) => setTone(value)} disabled={isGenerating}>
              <SelectTrigger id="tone">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="formal">🎩 Profissional</SelectItem>
                <SelectItem value="casual">😊 Casual</SelectItem>
                <SelectItem value="friendly">🤗 Amigável</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Botão Gerar */}
          {!generatedData && (
            <Button 
              onClick={handleGenerate} 
              disabled={isGenerating || !selectedTrigger}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Gerando mensagem...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Gerar Mensagem
                </>
              )}
            </Button>
          )}

          {/* Preview da Mensagem Gerada */}
          {generatedData && (
            <div className="space-y-4 pt-4 border-t">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Mensagem Gerada</Label>
                  <Badge variant="secondary" className="text-xs">
                    ✨ {toneLabels[tone]}
                  </Badge>
                </div>
                
                <WhatsAppPreview message={processTemplate(generatedData.message, {})} />

                {/* Variáveis Usadas */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Variáveis utilizadas:</Label>
                  <div className="flex flex-wrap gap-2">
                    {generatedData.usedVariables?.map((variable) => (
                      <Badge key={variable} variant="outline" className="text-xs">
                        {variable}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Nome Sugerido */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Nome sugerido:</Label>
                  <p className="text-sm font-mono bg-muted px-2 py-1 rounded">
                    {generatedData.suggestedName}
                  </p>
                </div>

                {/* Reasoning (Collapsible) */}
                {generatedData.reasoning && (
                  <Collapsible>
                    <CollapsibleTrigger className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                      Por que a IA escolheu isso? (clique para ver)
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-2">
                      <p className="text-xs text-muted-foreground italic bg-muted/50 p-2 rounded">
                        {generatedData.reasoning}
                      </p>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>

              {/* Ações */}
              <div className="flex gap-2">
                <Button onClick={handleUseMessage} className="flex-1">
                  Usar esta mensagem
                </Button>
                <Button 
                  onClick={handleRegenerate} 
                  variant="outline"
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
                <Button onClick={handleCancel} variant="ghost">
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {/* Botão Cancelar (quando não há mensagem gerada) */}
          {!generatedData && (
            <Button onClick={handleCancel} variant="outline" className="w-full">
              Cancelar
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
