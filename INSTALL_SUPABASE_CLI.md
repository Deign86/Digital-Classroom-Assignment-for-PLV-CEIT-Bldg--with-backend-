# Installing Supabase CLI on Windows

## ⚠️ Important: Global npm Install No Longer Works!

If you tried `npm install -g supabase` and got an error, that's expected! Supabase CLI no longer supports global npm installation.

## ✅ Recommended Installation Methods

### Option 1: Scoop (Easiest & Recommended)

```powershell
# 1. Install Scoop if you don't have it
# Visit https://scoop.sh/ and follow instructions, or run:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
Invoke-RestMethod -Uri https://get.scoop.sh | Invoke-Expression

# 2. Add Supabase bucket
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git

# 3. Install Supabase CLI
scoop install supabase

# 4. Verify installation
supabase --version
```

### Option 2: Chocolatey

```powershell
# Install via Chocolatey
choco install supabase

# Verify installation
supabase --version
```

### Option 3: Manual Download

1. Go to: https://github.com/supabase/cli/releases
2. Download `supabase_windows_amd64.tar.gz` (or the latest Windows version)
3. Extract the archive
4. Add the extracted folder to your Windows PATH
5. Restart your terminal
6. Verify: `supabase --version`

### Option 4: Project-Specific (Use npx)

```powershell
# Install as dev dependency (NOT global)
npm install supabase --save-dev

# Then use with npx for all commands:
npx supabase --version
npx supabase login
npx supabase link --project-ref your-ref
npx supabase functions deploy
```

## 🚀 Quick Start After Installation

Once installed, follow these steps:

```powershell
# 1. Login to Supabase
supabase login

# 2. Link your project (get ref from Supabase Dashboard > Settings > General)
supabase link --project-ref your-project-ref

# 3. Set secrets (these stay on Supabase servers, not in your code)
supabase secrets set SUPABASE_URL=https://your-project.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
supabase secrets set SUPABASE_ANON_KEY=your-anon-key

# 4. Deploy Edge Functions
supabase functions deploy
```

## 🔍 Troubleshooting

### "command not found" after installation
- **Restart your terminal** or PowerShell window
- Check if the CLI is in your PATH: `where.exe supabase`

### Using Scoop behind a corporate proxy
```powershell
scoop config proxy http://proxy:port
```

### Permission denied errors with Scoop
```powershell
# Run PowerShell as Administrator
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Which method should I choose?

| Method | Pros | Cons | Recommended? |
|--------|------|------|--------------|
| **Scoop** | ✅ Easy updates<br>✅ Clean uninstall<br>✅ Version management | Requires Scoop installation | ⭐ **Yes** |
| **Chocolatey** | ✅ Popular package manager<br>✅ Easy updates | Requires Choco installation | ✅ Yes if you use Choco |
| **Manual** | ✅ No dependencies<br>✅ Full control | ❌ Manual updates<br>❌ PATH setup required | ⚠️ If needed |
| **npx** | ✅ Project-specific<br>✅ No global install | ❌ Must use `npx`<br>❌ Slower | ⚠️ Last resort |

## 📚 More Info

- [Supabase CLI Official Docs](https://supabase.com/docs/reference/cli/introduction)
- [GitHub Releases](https://github.com/supabase/cli/releases)
- [Scoop Installation](https://scoop.sh/)

---

**Ready?** Continue with the deployment steps in `DEPLOY_FUNCTIONS.md` or `EDGE_FUNCTIONS_SETUP.md`!
