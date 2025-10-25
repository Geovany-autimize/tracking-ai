import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MessageTemplate } from '@/types/templates';
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
      
      // Convert notification_type from array to single value for compatibility
      return data.map(template => ({
        ...template,
        notification_type: Array.isArray(template.notification_type) 
          ? template.notification_type[0] 
          : template.notification_type
      })) as MessageTemplate[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (template: Omit<MessageTemplate, 'id' | 'customer_id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('message_templates')
        .insert([template as any])
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
      toast.error('Erro ao criar template');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...template }: Partial<MessageTemplate> & { id: string }) => {
      const { data, error } = await supabase
        .from('message_templates')
        .update(template as any)
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
      toast.error('Erro ao atualizar template');
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

      const { data, error } = await supabase
        .from('message_templates')
        .insert([{
          name: `${original.name} (cópia)`,
          notification_type: original.notification_type,
          is_active: false,
          message_content: original.message_content,
        } as any])
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
    createTemplate: createMutation.mutate,
    updateTemplate: updateMutation.mutate,
    deleteTemplate: deleteMutation.mutate,
    duplicateTemplate: duplicateMutation.mutate,
  };
}
