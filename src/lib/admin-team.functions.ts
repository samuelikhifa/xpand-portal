import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

export const listAdmins = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profiles, error } = await supabaseAdmin
      .from("profiles")
      .select("id, role, created_at")
      .eq("role", "admin");
    if (error) throw new Error(error.message);
    const { data: list } = await supabaseAdmin.auth.admin.listUsers();
    const emailMap = new Map(list.users.map((u) => [u.id, u.email ?? ""]));
    return {
      admins: (profiles ?? []).map((p) => ({
        id: p.id,
        email: emailMap.get(p.id) ?? "",
        created_at: p.created_at,
      })),
    };
  });

const InviteInput = z.object({
  email: z.string().email().max(255),
});

export const inviteAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => InviteInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getRequestUrl } = await import("@tanstack/react-start/server");
    const email = data.email.trim().toLowerCase();
    
    // Check if user already exists
    const { data: list, error: lErr } = await supabaseAdmin.auth.admin.listUsers();
    if (lErr) throw new Error(lErr.message);
    const existingUser = list.users.find((u) => u.email?.toLowerCase() === email);
    
    if (existingUser) {
      // User exists, just update their profile to admin role
      const { error: upErr } = await supabaseAdmin
        .from("profiles")
        .upsert({ id: existingUser.id, role: "admin" }, { onConflict: "id" });
      if (upErr) throw new Error(upErr.message);
      
      await supabaseAdmin.from("admin_audit_log").insert({
        actor_id: context.userId,
        action: "invite_admin",
        entity_type: "admin",
        entity_id: existingUser.id,
        details: { email, note: "Existing user promoted to admin" },
      });
      return { ok: true, message: "User already exists and has been promoted to admin" };
    }
    
    // User doesn't exist, send invite email
    const origin = new URL(getRequestUrl()).origin;
    const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${origin}/admin/accept-invite`,
    });
    
    if (inviteError) throw new Error(inviteError.message);
    
    // Create a pending admin profile (will be completed when they accept invite)
    // We need to wait for them to accept the invite to get their user ID
    // For now, we'll create a placeholder that will be updated when they accept
    // Actually, Supabase creates the user when they accept the invite, so we can't create the profile yet
    // We'll handle this in the accept-invite page
    
    await supabaseAdmin.from("admin_audit_log").insert({
      actor_id: context.userId,
      action: "invite_admin",
      entity_type: "admin",
      entity_id: email, // Use email as placeholder since we don't have user ID yet
      details: { email, note: "Invite email sent" },
    });
    
    return { ok: true, message: "Invite email sent" };
  });

const RevokeInput = z.object({ user_id: z.string().uuid() });
export const revokeAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => RevokeInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.user_id === context.userId) throw new Error("Cannot revoke yourself");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ role: "participant" })
      .eq("id", data.user_id);
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("admin_audit_log").insert({
      actor_id: context.userId,
      action: "revoke_admin",
      entity_type: "admin",
      entity_id: data.user_id,
    });
    return { ok: true };
  });
