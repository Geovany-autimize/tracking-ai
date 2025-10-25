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

export function AiGenerationDialog({ open, onOpenChange, onGenerate, trigger }: AiGenerationDialogProps) {
  const [intention, setIntention] = useState("");
  const [tone, setTone] = useState<'formal' | 'casual' | 'friendly'>('formal');
  const { generate, isGenerating, generatedData } = useAiTemplateGeneration();

  const handleGenerate = () => {
    if (!intention.trim()) {
      toast.error('Digite sua intenção para gerar a mensagem');
      return;
    }

    generate({
      intention: intention.trim(),
      trigger,
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
      setIntention("");
      toast.success('Mensagem inserida com sucesso!', {
        description: 'Você pode editá-la antes de salvar'
      });
    }
  };

  const handleCancel = () => {
    setIntention("");
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
          {/* Input de Intenção */}
          <div className="space-y-2">
            <Label htmlFor="intention">
              O que você quer comunicar? <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="intention"
              placeholder="Ex: Avisar que o pedido chegou na cidade de destino e deve ser entregue em breve"
              value={intention}
              onChange={(e) => setIntention(e.target.value)}
              className="min-h-[100px] resize-none"
              maxLength={500}
              disabled={isGenerating}
            />
            <p className="text-xs text-muted-foreground">
              {intention.length}/500 caracteres
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
              disabled={isGenerating || !intention.trim()}
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
