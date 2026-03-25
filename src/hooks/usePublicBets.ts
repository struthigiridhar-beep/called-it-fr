import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PublicBetMarket {
  id: string;
  question: string;
  status: string;
  yes_pool: number;
  no_pool: number;
  deadline: string;
  userSide: "yes" | "no";
  userAmount: number;
}

export function usePublicBets(userId: string | undefined) {
  return useQuery({
    queryKey: ["public-bets", userId],
    enabled: !!userId,
    staleTime: 30_000,
    queryFn: async (): Promise<PublicBetMarket[]> => {
      // Get user's bets
      const { data: bets } = await supabase
        .from("bets")
        .select("market_id, side, amount")
        .eq("user_id", userId!);

      if (!bets?.length) return [];

      const marketIds = [...new Set(bets.map((b) => b.market_id))];

      // Get public markets from those bets
      const { data: markets } = await supabase
        .from("markets")
        .select("id, question, status, yes_pool, no_pool, deadline")
        .in("id", marketIds)
        .eq("is_public", true);

      if (!markets?.length) return [];

      // Aggregate user bets per market
      const betsByMarket = new Map<string, { side: "yes" | "no"; amount: number }>();
      for (const b of bets) {
        const existing = betsByMarket.get(b.market_id);
        if (existing) {
          existing.amount += b.amount;
        } else {
          betsByMarket.set(b.market_id, { side: b.side as "yes" | "no", amount: b.amount });
        }
      }

      return markets.map((m) => {
        const bet = betsByMarket.get(m.id)!;
        return {
          ...m,
          userSide: bet.side,
          userAmount: bet.amount,
        };
      });
    },
  });
}
