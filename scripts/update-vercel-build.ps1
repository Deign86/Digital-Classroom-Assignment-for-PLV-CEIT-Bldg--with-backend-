$token = 'tfjkt9QNb6cHRWutQZDdE0Pp'
$project = 'plv-ceit-classroom'
$body = @{ buildCommand = 'npm run vercel-build' } | ConvertTo-Json
try {
    $resp = Invoke-RestMethod -Method Patch -Uri "https://api.vercel.com/v8/projects/$project" -Headers @{ Authorization = "Bearer $token"; 'Content-Type' = 'application/json' } -Body $body
    Write-Output "Project updated:"
    $resp | ConvertTo-Json -Depth 5
} catch {
    Write-Error "Failed to update project: $_"
    exit 2
}
