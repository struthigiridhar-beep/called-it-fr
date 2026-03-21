import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FeaturedMarket {
  id: string;
  question: string;
  category: string;
  deadline: string;
  yes_pool: number;
  no_pool: number;
  is_pinned: boolean;
  is_public: boolean;
  status: string;
}

export function useFeaturedMarket() {
  return useQuery({
    queryKey: ["featured-market"],
    queryFn: async (): Promise<FeaturedMarket | null> => {
      // First try pinned
      const { data: pinned } = await supabase
        .from("markets")
        .select("id, question, category, deadline, yes_pool, no_pool, is_pinned, is_public, status")
        .eq("is_public", true)
        .eq("is_pinned", true)
        .eq("status", "open")
        .limit(1)
        .single();

      if (pinned) return pinned as FeaturedMarket;

      // Fallback: highest volume public open market
      const { data } = await supabase
        .from("markets")
        .select("id, question, category, deadline, yes_pool, no_pool, is_pinned, is_public, status")
        .eq("is_public", true)
        .eq("status", "open")
        .order("yes_pool", { ascending: false })
        .limit(1)
        .single();

      return (data as FeaturedMarket) ?? null;
    },
    staleTime: 30_000,
  });
}
