<#.SYNOPSIS
  Verify AWS credentials and (optionally) Bedrock list access for the Bedrock profile.
#>
# Do not use ErrorAction Stop — AWS CLI may write to stderr even on success.
$ErrorActionPreference = 'Continue'
$Profile = 'ki-bedrock-inference-261916864828'
$Region  = 'eu-central-1'

Write-Host "Profile: $Profile  |  Region: $Region" -ForegroundColor Cyan
Write-Host ""

$null = & aws sts get-caller-identity --profile $Profile 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "STS failed. Try:" -ForegroundColor Yellow
    Write-Host "  aws sso login --profile $Profile"
    Write-Host "  aws configure sso --profile $Profile   # if SSO start URL, account, or role changed"
    exit 1
}
Write-Host "STS OK:" -ForegroundColor Green
aws sts get-caller-identity --profile $Profile --output text
Write-Host ""

# Optional: may be denied if role only has InvokeModel, not ListFoundationModels
Write-Host "Bedrock list (optional; ignore if denied):" -ForegroundColor Cyan
$null = & aws bedrock list-foundation-models --region $Region --profile $Profile --max-items 1 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "Bedrock ListFoundationModels: OK" -ForegroundColor Green
} else {
    Write-Host "ListFoundationModels not allowed (common). Try invoke anyway:  .\ask-claude.ps1 `"test`"" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Next:  .\ask-claude.ps1 `"test`"" -ForegroundColor Cyan
