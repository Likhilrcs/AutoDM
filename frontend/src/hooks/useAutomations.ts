import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { automationsApi, CreateAutomationPayload } from '@/services/automationsApi';
import { toast } from 'sonner';

export const useAutomations = (status?: string, q?: string, page = 1) => {
  return useQuery({
    queryKey: ['automations', status, q, page],
    queryFn: () => automationsApi.list(status, q, page),
  });
};

export const useAutomation = (id?: string) => {
  return useQuery({
    queryKey: ['automation', id],
    queryFn: () => (id ? automationsApi.get(id) : null),
    enabled: !!id,
  });
};

export const useCreateAutomation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAutomationPayload) => automationsApi.create(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['automations'] });
      toast.success(
        data.status === 'active'
          ? 'AutoDM activated! Live comments matching your trigger will now receive this DM.'
          : 'Automation saved as draft.'
      );
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to create automation.');
    },
  });
};

export const useDeleteAutomation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => automationsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automations'] });
      toast.success('Automation removed.');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to delete automation.');
    },
  });
};

export const useToggleStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, currentStatus }: { id: string; currentStatus: string }) => {
      if (currentStatus === 'active') {
        return automationsApi.pause(id);
      }
      return automationsApi.activate(id);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['automations'] });
      queryClient.invalidateQueries({ queryKey: ['automation', data.id] });
      toast.success(`Automation is now ${data.status}`);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update automation status.');
    },
  });
};
