# Deploy only reCAPTCHA-related Cloud Functions
# This script deploys only the functions that were modified for reCAPTCHA with CORS

Write-Host "Building Cloud Functions..." -ForegroundColor Cyan
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "`nDeploying reCAPTCHA functions with CORS configuration..." -ForegroundColor Cyan

# Deploy only the three functions we modified
firebase deploy --only functions:verifyLoginRecaptcha,functions:verifyRecaptcha,functions:createSignupRequest --force

Write-Host "`nDeployment complete!" -ForegroundColor Green
