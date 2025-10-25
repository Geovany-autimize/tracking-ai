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
    mutationFn: async (template: Omit<MessageTemplate, 'id' | 'created_at' | 'updated_at'>) => {
      const payload: any = {
        ...template,
        // DB expects text[]; UI uses single value
        notification_type: Array.isArray((template as any).notification_type)
          ? (template as any).notification_type
          : [template.notification_type as any],
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
      toast.error('Erro ao criar template');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...template }: Partial<MessageTemplate> & { id: string }) => {
      const payload: any = { ...template };
      if (template.notification_type) {
        payload.notification_type = Array.isArray((template as any).notification_type)
          ? (template as any).notification_type
          : [template.notification_type as any];
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

      const notificationType = Array.isArray(original.notification_type)
        ? original.notification_type
        : [original.notification_type];

      const { data, error } = await supabase
        .from('message_templates')
        .insert([{
          name: `${original.name} (cópia)`,
          notification_type: notificationType,
          is_active: false,
          message_content: original.message_content,
          customer_id: original.customer_id,
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

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive, notificationType }: { id: string; isActive: boolean; notificationType: string }) => {
      // Se estiver ativando, desativa outros templates do mesmo tipo primeiro
      if (isActive) {
        await supabase
          .from('message_templates')
          .update({ is_active: false })
          .eq('notification_type', [notificationType])
          .neq('id', id);
      }

      const { data, error } = await supabase
        .from('message_templates')
        .update({ is_active: isActive })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-templates'] });
      toast.success('Status atualizado com sucesso!');
    },
    onError: (error) => {
      console.error('Error toggling template:', error);
      toast.error('Erro ao atualizar status');
    },
  });

  return {
    templates: templates || [],
    isLoading,
    createTemplate: createMutation.mutate,
    updateTemplate: updateMutation.mutate,
    deleteTemplate: deleteMutation.mutate,
    duplicateTemplate: duplicateMutation.mutate,
    toggleActive: toggleActiveMutation.mutate,
  };
}
