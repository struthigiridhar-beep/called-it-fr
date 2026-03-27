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

    const body = await req.json().catch(() => ({}));
    const targetGroupId = body.group_id;

    // Get groups to process
    let groups: { id: string }[];
    if (targetGroupId) {
      groups = [{ id: targetGroupId }];
    } else {
      const { data } = await supabase.from("groups").select("id");
      groups = data ?? [];
    }

    const results: string[] = [];

    for (const group of groups) {
      const gid = group.id;

      // Fetch members
      const { data: members } = await supabase
        .from("group_members")
        .select("user_id, judge_integrity")
        .eq("group_id", gid);

      if (!members?.length) {
        results.push(`${gid}: no members`);
        continue;
      }

      const memberIds = members.map((m) => m.user_id);

      // Fetch all group market ids
      const { data: groupMarkets } = await supabase
        .from("markets")
        .select("id, created_by, yes_pool, no_pool, status")
        .eq("group_id", gid);

      const marketIds = (groupMarkets ?? []).map((m) => m.id);
      const resolvedMarketIds = (groupMarkets ?? [])
        .filter((m) => m.status === "resolved")
        .map((m) => m.id);

      // Fetch all bets for group markets
      const { data: allBets } = marketIds.length
        ? await supabase
            .from("bets")
            .select("user_id, market_id, side, amount")
            .in("market_id", marketIds)
        : { data: [] };

      // Fetch committed verdicts for group markets
      const { data: allVerdicts } = marketIds.length
        ? await supabase
            .from("verdicts")
            .select("market_id, verdict, judge_id, status")
            .in("market_id", marketIds)
            .eq("status", "committed")
        : { data: [] };

      const verdictMap = new Map(
        (allVerdicts ?? []).map((v) => [v.market_id, v.verdict])
      );

      // Fetch reactions for events in this group
      const { data: groupEvents } = await supabase
        .from("events")
        .select("id")
        .eq("group_id", gid);

      const eventIds = (groupEvents ?? []).map((e) => e.id);

      const { data: allReactions } = eventIds.length
        ? await supabase
            .from("reactions")
            .select("user_id")
            .eq("target_type", "event")
            .in("target_id", eventIds)
        : { data: [] };

      // --- Compute scores per role ---

      // 1. Prophetic: accuracy among settled bets (min 5)
      const propheticScores: { user_id: string; score: number }[] = [];
      for (const uid of memberIds) {
        const userBets = (allBets ?? []).filter(
          (b) => b.user_id === uid && verdictMap.has(b.market_id)
        );
        // Deduplicate by market (take the side of first bet)
        const marketSides = new Map<string, string>();
        for (const b of userBets) {
          if (!marketSides.has(b.market_id)) marketSides.set(b.market_id, b.side);
        }
        const total = marketSides.size;
        if (total < 5) continue;
        let wins = 0;
        for (const [mid, side] of marketSides) {
          if (verdictMap.get(mid) === side) wins++;
        }
        propheticScores.push({ user_id: uid, score: wins / total });
      }
      propheticScores.sort((a, b) => b.score - a.score);

      // 2. Wildcard: highest % of bets against >70% majority
      const wildcardScores: { user_id: string; score: number }[] = [];
      for (const uid of memberIds) {
        const userBets = (allBets ?? []).filter((b) => b.user_id === uid);
        if (!userBets.length) continue;
        let contrarianCount = 0;
        const seenMarkets = new Set<string>();
        for (const b of userBets) {
          if (seenMarkets.has(b.market_id)) continue;
          seenMarkets.add(b.market_id);
          const market = (groupMarkets ?? []).find((m) => m.id === b.market_id);
          if (!market) continue;
          const total = market.yes_pool + market.no_pool;
          if (total === 0) continue;
          const otherPool =
            b.side === "yes" ? market.no_pool : market.yes_pool;
          if (otherPool / total > 0.7) contrarianCount++;
        }
        if (seenMarkets.size >= 3) {
          wildcardScores.push({
            user_id: uid,
            score: contrarianCount / seenMarkets.size,
          });
        }
      }
      wildcardScores.sort((a, b) => b.score - a.score);

      // 3. HypedUp: most reactions sent
      const reactionCounts = new Map<string, number>();
      for (const r of allReactions ?? []) {
        reactionCounts.set(r.user_id, (reactionCounts.get(r.user_id) ?? 0) + 1);
      }
      const hypedScores = memberIds
        .filter((uid) => (reactionCounts.get(uid) ?? 0) > 0)
        .map((uid) => ({ user_id: uid, score: reactionCounts.get(uid)! }))
        .sort((a, b) => b.score - a.score);

      // 4. Judge: highest judge_integrity with min 2 assignments
      const judgeCounts = new Map<string, number>();
      for (const v of allVerdicts ?? []) {
        judgeCounts.set(v.judge_id, (judgeCounts.get(v.judge_id) ?? 0) + 1);
      }
      const judgeScores = members
        .filter(
          (m) =>
            memberIds.includes(m.user_id) &&
            (judgeCounts.get(m.user_id) ?? 0) >= 2
        )
        .map((m) => ({ user_id: m.user_id, score: Number(m.judge_integrity) }))
        .sort((a, b) => b.score - a.score);

      // 5. Creator: most markets created
      const creatorCounts = new Map<string, number>();
      for (const m of groupMarkets ?? []) {
        if (m.created_by && memberIds.includes(m.created_by)) {
          creatorCounts.set(
            m.created_by,
            (creatorCounts.get(m.created_by) ?? 0) + 1
          );
        }
      }
      const creatorScores = [...creatorCounts.entries()]
        .map(([uid, count]) => ({ user_id: uid, score: count }))
        .sort((a, b) => b.score - a.score);

      // --- Greedy assignment (priority order) ---
      const assigned = new Set<string>();
      const roleAssignments = new Map<string, string>();

      const roles: { role: string; candidates: { user_id: string }[] }[] = [
        { role: "prophetic", candidates: propheticScores },
        { role: "wildcard", candidates: wildcardScores },
        { role: "hyped", candidates: hypedScores },
        { role: "judge", candidates: judgeScores },
        { role: "creator", candidates: creatorScores },
      ];

      for (const { role, candidates } of roles) {
        for (const c of candidates) {
          if (!assigned.has(c.user_id)) {
            roleAssignments.set(c.user_id, role);
            assigned.add(c.user_id);
            break;
          }
        }
      }

      // Update all members
      for (const m of members) {
        const role = roleAssignments.get(m.user_id) ?? null;
        await supabase
          .from("group_members")
          .update({ crew_role: role })
          .eq("group_id", gid)
          .eq("user_id", m.user_id);
      }

      results.push(`${gid}: roles assigned (${roleAssignments.size})`);
    }

    return new Response(JSON.stringify({ message: "Done", results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
