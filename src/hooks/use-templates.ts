import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MessageTemplate, NotificationTrigger } from '@/types/templates';
import { toast } from 'sonner';

export function useTemplates() {
  const queryClient = useQueryClient();

  const { data: templates, isLoading } = useQuery({
    queryKey: ['message-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('message_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return data as MessageTemplate[];
    },
  });

  // Obter template ativo para um gatilho específico
  const getActiveTemplateForTrigger = (trigger: NotificationTrigger): MessageTemplate | null => {
    if (!templates) return null;
    
    return templates.find(t => 
      t.is_active && 
      Array.isArray(t.notification_type) && 
      t.notification_type.includes(trigger)
    ) || null;
  };

  // Atribuir template a um gatilho
  const assignTemplateMutation = useMutation({
    mutationFn: async ({ trigger, templateId }: { trigger: NotificationTrigger; templateId: string | null }) => {
      // 1. Desativar template atual desse trigger (se existir)
      const activeTemplate = getActiveTemplateForTrigger(trigger);
      if (activeTemplate) {
        const updatedTypes = (activeTemplate.notification_type as string[]).filter(t => t !== trigger);
        const shouldDeactivate = updatedTypes.length === 0;
        
        await supabase
          .from('message_templates')
          .update({ 
            notification_type: updatedTypes.length > 0 ? updatedTypes : [],
            is_active: !shouldDeactivate
          })
          .eq('id', activeTemplate.id);
      }
      
      // 2. Ativar novo template (se templateId não for null)
      if (templateId) {
        const { data: template } = await supabase
          .from('message_templates')
          .select('*')
          .eq('id', templateId)
          .single();
        
        if (template) {
          const currentTypes = Array.isArray(template.notification_type) ? template.notification_type : [];
          const newTypes = [...new Set([...currentTypes, trigger])]; // Remove duplicatas
          
          const { error } = await supabase
            .from('message_templates')
            .update({ 
              notification_type: newTypes,
              is_active: true
            })
            .eq('id', templateId);
          
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-templates'] });
      toast.success('Template atribuído com sucesso!');
    },
    onError: (error) => {
      console.error('Error assigning template:', error);
      toast.error('Erro ao atribuir template');
    },
  });

  const createMutation = useMutation({
    mutationFn: async (template: Omit<MessageTemplate, 'id' | 'created_at' | 'updated_at'>) => {
      const payload: any = {
        ...template,
        name: template.name.trim(),
        notification_type: [], // Templates criados sem gatilho inicialmente
        is_active: false,
        creation_method: template.creation_method || 'manual',
      };

      const { data, error } = await supabase
        .from('message_templates')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-templates'] });
      toast.success('Template criado com sucesso!');
    },
    onError: (error) => {
      console.error('Error creating template:', error);
      let message = 'Não foi possível criar o template. Por favor, tente novamente.';
      
      if (error instanceof Error) {
        if (error.message.includes('message_templates_name_unique') || 
            error.message.includes('duplicate key value')) {
          message = '⚠️ Template não criado: Já existe um template com este nome. Por favor, escolha um nome diferente.';
        } else {
          message = '⚠️ Erro ao criar template: ' + error.message;
        }
      }
      
      toast.error(message, {
        duration: 5000,
        style: {
          background: 'hsl(var(--destructive))',
          color: 'hsl(var(--destructive-foreground))',
          border: '1px solid hsl(var(--destructive))',
        },
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...template }: Partial<MessageTemplate> & { id: string }) => {
      const payload: any = { ...template };
      
      if (template.name) {
        payload.name = template.name.trim();
      }

      const { data, error } = await supabase
        .from('message_templates')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-templates'] });
      toast.success('Template atualizado com sucesso!');
    },
    onError: (error) => {
      console.error('Error updating template:', error);
      let message = 'Não foi possível atualizar o template. Por favor, tente novamente.';
      
      if (error instanceof Error) {
        if (error.message.includes('message_templates_name_unique') || 
            error.message.includes('duplicate key value')) {
          message = '⚠️ Template não atualizado: Já existe outro template com este nome. Por favor, escolha um nome diferente.';
        } else {
          message = '⚠️ Erro ao atualizar template: ' + error.message;
        }
      }
      
      toast.error(message, {
        duration: 5000,
        style: {
          background: 'hsl(var(--destructive))',
          color: 'hsl(var(--destructive-foreground))',
          border: '1px solid hsl(var(--destructive))',
        },
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('message_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-templates'] });
      toast.success('Template excluído com sucesso!');
    },
    onError: (error) => {
      console.error('Error deleting template:', error);
      toast.error('Erro ao excluir template');
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const { data: original, error: fetchError } = await supabase
        .from('message_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (fetchError) throw fetchError;

      // Generate unique name for duplicate
      let copyName = `${original.name}_copia`;
      let counter = 1;
      
      while (true) {
        const { data: existing } = await supabase
          .from('message_templates')
          .select('id')
          .eq('name', copyName)
          .maybeSingle();
        
        if (!existing) break;
        
        counter++;
        copyName = `${original.name}_copia_${counter}`;
      }

      const { data, error } = await supabase
        .from('message_templates')
        .insert([{
          name: copyName,
          notification_type: [], // Duplicatas criadas sem gatilho
          is_active: false,
          message_content: original.message_content,
          customer_id: original.customer_id,
          creation_method: 'manual', // Duplicatas são consideradas manuais
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-templates'] });
      toast.success('Template duplicado com sucesso!');
    },
    onError: (error) => {
      console.error('Error duplicating template:', error);
      toast.error('Erro ao duplicar template');
    },
  });

  return {
    templates: templates || [],
    isLoading,
    getActiveTemplateForTrigger,
    assignTemplate: assignTemplateMutation.mutate,
    createTemplate: createMutation.mutate,
    updateTemplate: updateMutation.mutate,
    deleteTemplate: deleteMutation.mutate,
    duplicateTemplate: duplicateMutation.mutate,
  };
}
