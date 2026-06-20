# XPAND Portal - Deployment Guide
**CRITICAL: Read this before deploying to production**

---

## 🚨 CRITICAL ACTION REQUIRED BEFORE LAUNCH

### 1. Add Supabase Service Role Key (MANDATORY)

The application will NOT work without the service role key. This is required for admin operations.

**Steps:**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `ojpzfyefevllcanbfziu`
3. Navigate to **Settings** → **API**
4. Copy the **service_role** key (NOT the anon key)
5. Paste it into `.env` line 4:
   ```
   SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"
   ```
6. Paste it into `wrangler.jsonc` line 19:
   ```json
   "SUPABASE_SERVICE_ROLE_KEY": "your-service-role-key-here"
   ```

**⚠️ WARNING**: Never commit the service role key to git. It's already in `.gitignore`.

---

## 📋 Pre-Deployment Checklist

### Database Changes

Run the new migration to add RLS policies and performance indexes:

```bash
# Using Supabase CLI
supabase db push

# Or manually run the migration in Supabase Dashboard:
# SQL Editor → supabase/migrations/20260619090000_add_rls_and_indexes.sql
```

### Environment Variables

Verify all environment variables are set:

**Local Development (.env):**
- ✅ SUPABASE_URL
- ✅ SUPABASE_PROJECT_ID
- ✅ SUPABASE_PUBLISHABLE_KEY
- ✅ SUPABASE_ANON_KEY (added)
- 🔴 SUPABASE_SERVICE_ROLE_KEY (YOU MUST ADD THIS)
- ✅ VITE_SUPABASE_URL
- ✅ VITE_SUPABASE_PROJECT_ID
- ✅ VITE_SUPABASE_PUBLISHABLE_KEY
- ✅ VITE_SUPABASE_ANON_KEY (added)

**Cloudflare Workers (wrangler.jsonc):**
- ✅ SUPABASE_URL
- ✅ SUPABASE_PROJECT_ID
- ✅ SUPABASE_PUBLISHABLE_KEY
- ✅ SUPABASE_ANON_KEY (added)
- 🔴 SUPABASE_SERVICE_ROLE_KEY (YOU MUST ADD THIS)
- ✅ VITE_SUPABASE_URL
- ✅ VITE_SUPABASE_PROJECT_ID
- ✅ VITE_SUPABASE_PUBLISHABLE_KEY
- ✅ VITE_SUPABASE_ANON_KEY (added)

---

## 🚀 Deployment Steps

### Option 1: Deploy to Cloudflare Workers (Recommended)

```bash
# Install dependencies
npm install

# Build the application
npm run build

# Deploy to Cloudflare Workers
npm run deploy
```

**Or using Wrangler directly:**
```bash
wrangler deploy
```

### Option 2: Deploy to Lovable Cloud

If you're using Lovable's hosting:

1. Push your code to GitHub
2. Connect your repository in Lovable
3. Add environment variables in Lovable dashboard:
   - SUPABASE_URL
   - SUPABASE_PROJECT_ID
   - SUPABASE_PUBLISHABLE_KEY
   - SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY (CRITICAL)
   - VITE_SUPABASE_URL
   - VITE_SUPABASE_PROJECT_ID
   - VITE_SUPABASE_PUBLISHABLE_KEY
   - VITE_SUPABASE_ANON_KEY
4. Click deploy

### Option 3: Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

---

## ✅ Post-Deployment Verification

### 1. Test Admin Flow
- [ ] Navigate to `/admin/login`
- [ ] Create first admin account (bootstrap)
- [ ] Login with admin credentials
- [ ] Verify dashboard loads
- [ ] Test participant management
- [ ] Test attendance tracking
- [ ] Test score management

### 2. Test Participant Flow
- [ ] Navigate to `/register`
- [ ] Register a new participant
- [ ] Check email for magic link
- [ ] Click magic link to verify
- [ ] Verify participant appears in admin dashboard

### 3. Test Security
- [ ] Try accessing admin routes without authentication (should redirect)
- [ ] Verify RLS policies are working
- [ ] Check audit log is recording actions
- [ ] Verify service role key is not exposed in client bundle

### 4. Test Performance
- [ ] Load dashboard with 50+ participants
- [ ] Test pagination (Previous/Next buttons)
- [ ] Verify audit log pagination works
- [ ] Check page load times

---

## 🔒 Security Configuration

### Supabase Settings

1. **Email Templates**: Verify email templates are configured in Supabase Dashboard → Authentication → Email Templates
2. **SMTP Settings**: If using custom SMTP, configure in Supabase Dashboard → Authentication → Providers → Email
3. **RLS Policies**: Verify all tables have RLS enabled
4. **API Restrictions**: Ensure service role key is only used server-side

### Cloudflare Workers Settings

1. **Environment Variables**: Set all required variables in Cloudflare dashboard
2. **Domain**: Configure custom domain if needed
3. **Analytics**: Enable Cloudflare Analytics for monitoring
4. **Rate Limiting**: Consider adding rate limiting rules

---

## 📊 Monitoring Setup

### Cloudflare Analytics
- Enable in Cloudflare dashboard
- Monitor request rates
- Track error rates
- Set up alerts for high error rates

### Supabase Logs
- Enable database logs
- Monitor auth logs
- Track API usage
- Set up alerts for suspicious activity

### Error Tracking
The app includes Lovable error reporting. Verify it's working by checking the console for errors.

---

## 🐛 Troubleshooting

### "Missing Supabase environment variable(s)" Error

**Cause**: Missing or incorrect environment variables

**Solution**:
1. Check `.env` file has all required variables
2. For Cloudflare deployment, check wrangler.jsonc
3. For Lovable deployment, check environment variables in dashboard
4. **CRITICAL**: Ensure SUPABASE_SERVICE_ROLE_KEY is set

### "Unauthorized" or "Forbidden" Errors

**Cause**: RLS policies blocking access

**Solution**:
1. Verify user is authenticated
2. Check user has correct role in `profiles` table
3. Verify RLS policies are correctly configured
4. Run the migration to add missing policies

### Admin Operations Failing

**Cause**: Service role key not set or incorrect

**Solution**:
1. Verify SUPABASE_SERVICE_ROLE_KEY is set
2. Ensure it's the correct key from Supabase dashboard
3. Check it's not the anon key

### Email Not Sending

**Cause**: Supabase email configuration

**Solution**:
1. Check email templates in Supabase dashboard
2. Verify SMTP settings if using custom SMTP
3. Check spam folder
4. Verify email is valid format

### Pagination Not Working

**Cause**: Database migration not run

**Solution**:
1. Run the migration: `supabase db push`
2. Or manually run SQL in Supabase Dashboard SQL Editor

---

## 📝 Important Notes

### Service Role Key Security
- The service role key bypasses RLS and has full database access
- NEVER expose it in client-side code
- ONLY use it in server functions (`.functions.ts` files)
- The app correctly uses it only in server-side imports

### Email Configuration
- Participants receive magic links for verification
- Ensure email templates are configured in Supabase
- Test email delivery before launch
- Check spam folders during testing

### Database Backups
- Supabase automatically backs up your database
- Verify backup retention settings
- Consider point-in-time recovery for critical data

### Scaling
- Cloudflare Workers auto-scale
- Supabase handles database scaling
- Monitor performance as user base grows
- Consider upgrading Supabase plan if needed

---

## 🎯 Launch Day Checklist

### 1 Hour Before Launch
- [ ] Add SUPABASE_SERVICE_ROLE_KEY to production environment
- [ ] Run database migrations
- [ ] Verify all environment variables are set
- [ ] Test all critical flows end-to-end
- [ ] Check email delivery is working
- [ ] Verify error tracking is enabled

### At Launch
- [ ] Deploy to production
- [ ] Verify deployment is live
- [ ] Test admin login
- [ ] Test participant registration
- [ ] Monitor error logs for 10 minutes
- [ ] Check analytics are recording

### 1 Hour After Launch
- [ ] Monitor error rates
- [ ] Check email delivery logs
- [ ] Verify audit log is recording
- [ ] Test pagination with real data
- [ ] Check performance metrics
- [ ] Set up monitoring alerts

### 24 Hours After Launch
- [ ] Review all error logs
- [ ] Check user feedback
- [ ] Monitor database performance
- [ ] Verify backup is working
- [ ] Update documentation if needed

---

## 🆘 Support Resources

### Documentation
- TanStack Start: https://tanstack.com/start/latest
- Supabase: https://supabase.com/docs
- Cloudflare Workers: https://developers.cloudflare.com/workers/

### Getting Help
- Supabase Discord: https://discord.supabase.com
- TanStack Discord: https://discord.com/tanstack
- Cloudflare Community: https://community.cloudflare.com

---

## 📞 Emergency Contacts

If something goes wrong during launch:

1. **Database Issues**: Check Supabase status page
2. **Deployment Issues**: Check Cloudflare status page
3. **Email Issues**: Check Supabase email logs
4. **Security Issues**: Revoke service role key immediately

---

## ✨ Success Criteria

Your launch is successful when:
- ✅ Admin can login and manage participants
- ✅ Participants can register and verify email
- ✅ Attendance tracking works
- ✅ Score management works
- ✅ Audit log records all admin actions
- ✅ Pagination works for large datasets
- ✅ No errors in production logs
- ✅ Email delivery is working
- ✅ Performance is acceptable (< 3s page load)

---

**Good luck with your launch! 🚀**
