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

const VerifyAdminRoleInput = z.object({
  userId: z.string().uuid(),
});

export const verifyAdminRole = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => VerifyAdminRoleInput.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", data.userId)
      .maybeSingle();
    
    if (error) throw new Error(error.message);
    
    return { isAdmin: profile?.role === "admin" };
  });

const CreateSessionInput = z.object({
  sessionName: z.string().min(1).max(255),
  sessionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const createSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CreateSessionInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    const { data: session, error } = await supabaseAdmin
      .from("sessions")
      .insert({ session_name: data.sessionName, session_date: data.sessionDate })
      .select()
      .single();
    
    if (error) throw new Error(error.message);
    
    await supabaseAdmin.from("admin_audit_log").insert({
      actor_id: context.userId,
      action: "create_session",
      entity_type: "session",
      entity_id: session.id,
      details: { session_name: data.sessionName, session_date: data.sessionDate },
    });
    
    return { session };
  });

export const cleanupOrphanedAdminProfiles = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  
  try {
    // Get all admin profiles
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("role", "admin");
    
    if (profilesError) {
      // If table doesn't exist, no cleanup needed
      if (profilesError.code === "42P01") {
        return { deleted: 0, message: "Profiles table doesn't exist" };
      }
      throw new Error(profilesError.message);
    }
    
    if (!profiles || profiles.length === 0) {
      return { deleted: 0, message: "No admin profiles found" };
    }
    
    // Get all auth users
    const { data: users, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (usersError) {
      throw new Error(usersError.message);
    }
    
    const authUserIds = new Set(users.users.map(u => u.id));
    
    // Find orphaned profiles (profiles without matching auth users)
    const orphanedIds = profiles
      .filter(p => !authUserIds.has(p.id))
      .map(p => p.id);
    
    if (orphanedIds.length === 0) {
      return { deleted: 0, message: "No orphaned profiles found" };
    }
    
    // Delete orphaned profiles
    const { error: deleteError } = await supabaseAdmin
      .from("profiles")
      .delete()
      .in("id", orphanedIds);
    
    if (deleteError) {
      throw new Error(deleteError.message);
    }
    
    return { deleted: orphanedIds.length, message: `Deleted ${orphanedIds.length} orphaned profiles` };
  } catch (err) {
    throw err;
  }
});

export const hasAnyAdmin = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  
  try {
    const { count, error } = await supabaseAdmin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    
    if (error) {
      // If table doesn't exist, no admin exists
      if (error.code === "42P01") {
        return { hasAdmin: false };
      }
      throw new Error(error.message || "Database query failed");
    }
    
    return { hasAdmin: (count ?? 0) > 0 };
  } catch (err) {
    throw err;
  }
});

const BootstrapInput = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(72),
});

export const bootstrapFirstAdmin = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => BootstrapInput.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Guard: only allowed when no admin exists yet
    const { count, error: cErr } = await supabaseAdmin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if (cErr) throw new Error(cErr.message);
    if ((count ?? 0) > 0) throw new Error("An admin already exists.");

    const email = data.email.trim().toLowerCase();

    // Try to create the auth user (confirmed) — if it exists, look it up
    let userId: string | undefined;
    const created = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
    });
    if (created.error) {
      // user may already exist — find by email via listUsers
      const { data: list, error: lErr } = await supabaseAdmin.auth.admin.listUsers();
      if (lErr) throw new Error(lErr.message);
      const found = list.users.find((u) => u.email?.toLowerCase() === email);
      if (!found) throw new Error(created.error.message);
      userId = found.id;
      // ensure password set
      await supabaseAdmin.auth.admin.updateUserById(found.id, { password: data.password });
    } else {
      userId = created.data.user?.id;
    }
    if (!userId) throw new Error("Could not resolve user id.");

    // Upsert profile as admin
    const { error: upErr } = await supabaseAdmin
      .from("profiles")
      .upsert({ id: userId, role: "admin" }, { onConflict: "id" });
    if (upErr) throw new Error(upErr.message);

    return { ok: true };
  });
