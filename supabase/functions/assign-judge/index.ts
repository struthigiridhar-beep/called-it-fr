import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Find open markets past deadline
    const { data: expiredMarkets, error: mErr } = await supabase
      .from("markets")
      .select("id, group_id, question, created_by")
      .eq("status", "open")
      .lt("deadline", new Date().toISOString());

    if (mErr) throw mErr;
    if (!expiredMarkets?.length) {
      return new Response(
        JSON.stringify({ message: "No expired markets", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: string[] = [];

    for (const market of expiredMarkets) {
      // 2. Close market
      await supabase
        .from("markets")
        .update({ status: "closed" })
        .eq("id", market.id);

      // 3. Check if verdict already exists for this market
      const { data: existingVerdict } = await supabase
        .from("verdicts")
        .select("id")
        .eq("market_id", market.id)
        .limit(1);

      if (existingVerdict?.length) {
        results.push(`${market.id}: already has verdict`);
        continue;
      }

      // 4. Get group members (exclude creator)
      const groupId = market.group_id;
      if (!groupId) {
        results.push(`${market.id}: no group_id, skipped`);
        continue;
      }

      const { data: members } = await supabase
        .from("group_members")
        .select("user_id")
        .eq("group_id", groupId);

      const eligibleMembers = (members ?? []).filter(
        (m) => m.user_id !== market.created_by
      );

      if (!eligibleMembers.length) {
        results.push(`${market.id}: no eligible members`);
        continue;
      }

      // 5. Get bets on this market
      const { data: bets } = await supabase
        .from("bets")
        .select("user_id, amount")
        .eq("market_id", market.id);

      const betsByUser = new Map<string, number>();
      (bets ?? []).forEach((b) => {
        betsByUser.set(b.user_id, (betsByUser.get(b.user_id) ?? 0) + b.amount);
      });

      // 6. Prefer members who didn't bet
      const nonBettors = eligibleMembers.filter(
        (m) => !betsByUser.has(m.user_id)
      );

      let judgeId: string;
      if (nonBettors.length) {
        // Random non-bettor
        judgeId =
          nonBettors[Math.floor(Math.random() * nonBettors.length)].user_id;
      } else {
        // Smallest stake among eligible
        const sorted = [...eligibleMembers].sort(
          (a, b) =>
            (betsByUser.get(a.user_id) ?? 0) -
            (betsByUser.get(b.user_id) ?? 0)
        );
        judgeId = sorted[0].user_id;
      }

      // 7. Insert verdict row (status=pending, verdict placeholder)
      const { error: vErr } = await supabase.from("verdicts").insert({
        judge_id: judgeId,
        market_id: market.id,
        verdict: "yes", // placeholder, ignored until status=committed
        status: "pending",
      });
      if (vErr) {
        results.push(`${market.id}: verdict insert error: ${vErr.message}`);
        continue;
      }

      // 8. Insert notification
      await supabase.from("notifications").insert({
        user_id: judgeId,
        type: "judge_assigned",
        payload: {
          market_id: market.id,
          group_id: groupId,
          question: market.question,
        },
      });

      results.push(`${market.id}: judge assigned → ${judgeId}`);
    }

    return new Response(
      JSON.stringify({ message: "Done", results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
