import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface GenerateTemplateParams {
  trigger: string;
  tone?: 'formal' | 'casual' | 'friendly';
}

interface GenerateTemplateResponse {
  message: string;
  suggestedName: string;
  usedVariables: string[];
  reasoning: string;
}

export function useAiTemplateGeneration() {
  const generateTemplate = useMutation({
    mutationFn: async (params: GenerateTemplateParams) => {
      const { data, error } = await supabase.functions.invoke<GenerateTemplateResponse>(
        'generate-template',
        { body: params }
      );
      
      if (error) {
        console.error('Erro ao chamar edge function:', error);
        throw new Error(error.message || 'Erro ao gerar template');
      }

      // Validação adicional do lado do cliente
      if (!data?.message || !data?.suggestedName) {
        throw new Error('Resposta inválida da IA');
      }

      // Verificar limite de caracteres
      if (data.message.length > 1024) {
        throw new Error('Mensagem gerada excede o limite de 1024 caracteres');
      }
      
      return data;
    },
    onError: (error: Error) => {
      console.error('Erro na geração de template:', error);
      toast.error('Erro ao gerar template', {
        description: error.message || 'Tente novamente em alguns instantes'
      });
    }
  });

  return {
    generate: generateTemplate.mutate,
    isGenerating: generateTemplate.isPending,
    generatedData: generateTemplate.data,
    error: generateTemplate.error,
    reset: generateTemplate.reset
  };
}
