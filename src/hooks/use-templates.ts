import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MessageTemplate } from '@/types/templates';
import { toast } from 'sonner';

export function useTemplates() {
  const queryClient = useQueryClient();

  // Helper para gerar slug único do nome
  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-z0-9\s-]/g, '') // Remove caracteres especiais
      .replace(/\s+/g, '_') // Substitui espaços por underscore
      .replace(/_+/g, '_') // Remove underscores duplicados
      .replace(/^_|_$/g, ''); // Remove underscores do início e fim
  };

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
      const slug = generateSlug(template.name);

      // Verifica se já existe um template com esse slug
      const { data: existing } = await supabase
        .from('message_templates')
        .select('id')
        .eq('name', slug)
        .maybeSingle();

      if (existing) {
        throw new Error('Já existe um template com este nome. Escolha um nome diferente.');
      }

      const payload: any = {
        ...template,
        name: slug,
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
      const message = error instanceof Error ? error.message : 'Erro ao criar template';
      toast.error(message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...template }: Partial<MessageTemplate> & { id: string }) => {
      const payload: any = { ...template };
      
      // Se está mudando o nome, gera novo slug e valida unicidade
      if (template.name) {
        const slug = generateSlug(template.name);
        
        const { data: existing } = await supabase
          .from('message_templates')
          .select('id')
          .eq('name', slug)
          .neq('id', id)
          .maybeSingle();

        if (existing) {
          throw new Error('Já existe um template com este nome. Escolha um nome diferente.');
        }

        payload.name = slug;
      }

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
      const message = error instanceof Error ? error.message : 'Erro ao atualizar template';
      toast.error(message);
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
        const { error: deactivateError } = await supabase
          .from('message_templates')
          .update({ is_active: false })
          .contains('notification_type', [notificationType])
          .neq('id', id);

        if (deactivateError) throw deactivateError;
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
