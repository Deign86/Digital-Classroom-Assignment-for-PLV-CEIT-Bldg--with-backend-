# Deploy Email Notification System
# Your personalized deployment script

Write-Host "Deploying Automated Email Notification System..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Check if Supabase CLI is installed
Write-Host "Step 1: Checking Supabase CLI..." -ForegroundColor Yellow
try {
    $supabaseVersion = supabase --version
    Write-Host "Supabase CLI is installed: $supabaseVersion" -ForegroundColor Green
} catch {
    Write-Host "Supabase CLI not found. Installing..." -ForegroundColor Red
    Write-Host "Running: npm install -g supabase" -ForegroundColor Gray
    npm install -g supabase
    Write-Host "Supabase CLI installed!" -ForegroundColor Green
}
Write-Host ""

# Step 2: Login to Supabase (if not already logged in)
Write-Host "Step 2: Logging in to Supabase..." -ForegroundColor Yellow
Write-Host "Your browser will open for authentication..." -ForegroundColor Gray
supabase login
Write-Host ""

# Step 3: Link to your project
Write-Host "Step 3: Linking to your Supabase project..." -ForegroundColor Yellow
Write-Host "You'll need your Project Reference ID from the Supabase Dashboard" -ForegroundColor Gray
Write-Host "Find it at: Dashboard → Project Settings → General → Reference ID" -ForegroundColor Gray
Write-Host ""
$projectRef = Read-Host "Enter your Project Reference ID"
supabase link --project-ref $projectRef
Write-Host ""

# Step 4: Set SMTP secrets with your credentials
Write-Host "Step 4: Configuring SMTP settings..." -ForegroundColor Yellow
Write-Host "Setting up Gmail SMTP with your credentials..." -ForegroundColor Gray

supabase secrets set SMTP_HOST=smtp.gmail.com
supabase secrets set SMTP_PORT=587
supabase secrets set SMTP_USER=deign86@gmail.com
supabase secrets set SMTP_PASS="qgzv hunt yfhx lioh"
supabase secrets set SMTP_FROM=deign86@gmail.com
supabase secrets set SMTP_FROM_NAME="PLV CEIT Classroom System"
supabase secrets set APP_URL=http://localhost:5173

Write-Host "SMTP secrets configured!" -ForegroundColor Green
Write-Host ""

# Step 5: Verify secrets
Write-Host "Step 5: Verifying secrets..." -ForegroundColor Yellow
supabase secrets list
Write-Host ""

# Step 6: Deploy the Edge Function
Write-Host "Step 6: Deploying Edge Function..." -ForegroundColor Yellow
Write-Host "Deploying send-approval-email function..." -ForegroundColor Gray
supabase functions deploy send-approval-email
Write-Host ""

# Step 7: Test the function
Write-Host "Step 7: Testing the function..." -ForegroundColor Yellow
Write-Host "Would you like to send a test email? (Y/N)" -ForegroundColor Gray
$testEmail = Read-Host

if ($testEmail -eq "Y" -or $testEmail -eq "y") {
    Write-Host ""
    Write-Host "Sending test email..." -ForegroundColor Cyan
    $testRecipient = Read-Host "Enter test email address (or press Enter to use deign86@gmail.com)"
    
    if ([string]::IsNullOrWhiteSpace($testRecipient)) {
        $testRecipient = "deign86@gmail.com"
    }
    
    # Get the Supabase anon key
    Write-Host ""
    Write-Host "You'll need your Supabase Anon Key" -ForegroundColor Gray
    Write-Host "Find it at: Dashboard → Project Settings → API → Project API keys → anon/public" -ForegroundColor Gray
    $anonKey = Read-Host "Enter your Supabase Anon Key"
    
    # Get the project URL
    Write-Host "You'll need your Supabase Project URL" -ForegroundColor Gray
    Write-Host "Format: https://[project-ref].supabase.co" -ForegroundColor Gray
    $projectUrl = Read-Host "Enter your Supabase Project URL"
    
    # Send test email
    $body = @{
        email = $testRecipient
        name = "Test User"
        password = "TestPassword123!"
    } | ConvertTo-Json
    
    $headers = @{
        "Content-Type" = "application/json"
        "Authorization" = "Bearer $anonKey"
    }
    
    try {
        $response = Invoke-WebRequest -Uri "$projectUrl/functions/v1/send-approval-email" -Method POST -Body $body -Headers $headers
        Write-Host "Test email sent successfully!" -ForegroundColor Green
        Write-Host "Response: $($response.Content)" -ForegroundColor Gray
        Write-Host ""
        Write-Host "Check $testRecipient inbox (including spam folder)" -ForegroundColor Cyan
    } catch {
        Write-Host "Failed to send test email" -ForegroundColor Red
        Write-Host "Error: $_" -ForegroundColor Red
        Write-Host ""
        Write-Host "Check function logs with: supabase functions logs send-approval-email" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Run: npm run dev" -ForegroundColor White
Write-Host "2. Login as admin" -ForegroundColor White
Write-Host "3. Go to Signup Approval tab" -ForegroundColor White
Write-Host "4. Approve a faculty member" -ForegroundColor White
Write-Host "5. Email will be sent automatically!" -ForegroundColor White
Write-Host ""
Write-Host "Useful commands:" -ForegroundColor Yellow
Write-Host "  View logs: supabase functions logs send-approval-email" -ForegroundColor Gray
Write-Host "  List secrets: supabase secrets list" -ForegroundColor Gray
Write-Host "  Redeploy: supabase functions deploy send-approval-email" -ForegroundColor Gray
Write-Host ""
Write-Host "Documentation: EMAIL_DEPLOYMENT_GUIDE.md" -ForegroundColor Cyan
Write-Host ""
