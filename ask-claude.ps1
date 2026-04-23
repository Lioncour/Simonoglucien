<#.SYNOPSIS
  Invoke Anthropic Claude on AWS Bedrock; prints assistant text (content[0].text).

.DESCRIPTION
  Uses profile ki-bedrock-inference-261916864828, region eu-central-1,
  model eu.anthropic.claude-sonnet-4-6.

.EXAMPLE
  .\ask-claude.ps1 "Summarize this repo"
#>
param(
    [Parameter(Mandatory = $true, Position = 0, ValueFromRemainingArguments = $true)]
    [string[]] $PromptParts
)

$ErrorActionPreference = 'Stop'

$Profile = 'ki-bedrock-inference-261916864828'
$Region  = 'eu-central-1'
$ModelId = 'eu.anthropic.claude-sonnet-4-6'

$prompt = ($PromptParts -join ' ').Trim()
if ([string]::IsNullOrWhiteSpace($prompt)) {
    Write-Error 'Prompt is empty.'
    exit 1
}

$bodyObj = [ordered]@{
    anthropic_version = 'bedrock-2023-05-31'
    max_tokens        = 8192
    messages          = @(
        @{
            role    = 'user'
            content = @(
                @{
                    type = 'text'
                    text = $prompt
                }
            )
        }
    )
}

$bodyJson = $bodyObj | ConvertTo-Json -Depth 20 -Compress
$reqFile  = [System.IO.Path]::GetTempFileName()
$respFile = [System.IO.Path]::GetTempFileName()
try {
    # UTF-8 no BOM for Bedrock JSON body
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($reqFile, $bodyJson, $utf8NoBom)

    # Windows: use file://C:/... (two slashes after file:) — file:///C:/... breaks the CLI param loader
    $bodyPath = $reqFile -replace '\\', '/'
    if ($bodyPath -match '^[A-Za-z]:') {
        $bodyUri = "file://$bodyPath"
    }
    else {
        $bodyUri = "file:///$bodyPath"
    }

    & aws bedrock-runtime invoke-model `
        --profile $Profile `
        --region $Region `
        --model-id $ModelId `
        --content-type 'application/json' `
        --body $bodyUri `
        --cli-binary-format raw-in-base64-out `
        $respFile

    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "AWS CLI failed (exit $LASTEXITCODE). Common fixes:" -ForegroundColor Yellow
        Write-Host "  aws sso login --profile $Profile" -ForegroundColor White
        Write-Host "  aws configure sso --profile $Profile   # if SSO URL/account/role changed" -ForegroundColor White
        Write-Host "  .\verify-bedrock-auth.ps1" -ForegroundColor White
        exit $LASTEXITCODE
    }

    $raw = Get-Content -LiteralPath $respFile -Raw -Encoding UTF8
    $resp = $raw | ConvertFrom-Json

    if ($resp.content -and $resp.content.Count -gt 0 -and $resp.content[0].text) {
        Write-Output $resp.content[0].text
    }
    elseif ($resp.completion) {
        # Legacy Claude / alternate shape
        Write-Output $resp.completion
    }
    else {
        Write-Error "Unexpected Bedrock response shape. Raw: $raw"
        exit 1
    }
}
finally {
    Remove-Item -LiteralPath $reqFile -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $respFile -ErrorAction SilentlyContinue
}
