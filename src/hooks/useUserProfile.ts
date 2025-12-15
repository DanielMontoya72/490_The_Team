import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useUserProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['user-profile', userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('first_name, last_name, email')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!userId
  });
}
