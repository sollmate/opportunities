<#
.SYNOPSIS
    Push variables from a local .env file to an Azure Container App.

.DESCRIPTION
    Reads a .env file, classifies each key:
      - Names matching any -SecretPatterns token  -> stored as Container App secrets
        and referenced from the env var as `secretref:<name>`.
      - Everything else -> set as plain environment variables.

    The Container App must already exist. Triggers one new revision.

.PARAMETER ResourceGroup
    Resource group of the Container App.

.PARAMETER ContainerApp
    Name of the Container App.

.PARAMETER EnvFile
    Path to the .env file. Default: .env in the current directory.

.PARAMETER SecretPatterns
    Substrings (case-insensitive) that mark a key as sensitive.
    Default: KEY, TOKEN, SECRET, PASSWORD, PASS, CONNECTIONSTRING, DATABASE_URL, CLIENT_ID.

.PARAMETER DryRun
    Print what would be sent without calling az.

.EXAMPLE
    .\scripts\push-env-to-aca.ps1 -ResourceGroup rg-opportunities-agent -ContainerApp ca-opportunities-agent-api

.EXAMPLE
    .\scripts\push-env-to-aca.ps1 -ResourceGroup rg-opportunities-agent -ContainerApp ca-opportunities-agent-api -DryRun
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)] [string] $ResourceGroup,
    [Parameter(Mandatory = $true)] [string] $ContainerApp,
    [string] $EnvFile = ".env",
    [string[]] $SecretPatterns = @("KEY", "TOKEN", "SECRET", "PASSWORD", "PASS", "CONNECTIONSTRING", "DATABASE_URL", "CLIENT_ID"),
    [switch] $DryRun
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $EnvFile)) {
    throw "Env file not found: $EnvFile"
}

function ConvertTo-SecretName([string]$key) {
    # ACA secret names: lowercase letters, digits, dashes only.
    return ($key.ToLower() -replace "[^a-z0-9-]", "-")
}

function Test-IsSecret([string]$key, [string[]]$patterns) {
    foreach ($p in $patterns) {
        if ($key -match [regex]::Escape($p)) { return $true }
    }
    return $false
}

$secrets = @()   # "name=value" for `az containerapp secret set`
$envVars = @()   # "KEY=value" or "KEY=secretref:name" for `az containerapp update`

Get-Content $EnvFile | ForEach-Object {
    $line = $_.Trim()
    if (-not $line) { return }
    if ($line.StartsWith("#")) { return }

    $eq = $line.IndexOf("=")
    if ($eq -lt 1) { return }

    $key   = $line.Substring(0, $eq).Trim()
    $value = $line.Substring($eq + 1).Trim()
    if ($value.StartsWith('"') -and $value.EndsWith('"')) { $value = $value.Substring(1, $value.Length - 2) }
    if ($value.StartsWith("'") -and $value.EndsWith("'")) { $value = $value.Substring(1, $value.Length - 2) }

    if (Test-IsSecret -key $key -patterns $SecretPatterns) {
        $secretName = ConvertTo-SecretName $key
        $secrets   += "$secretName=$value"
        $envVars   += "$key=secretref:$secretName"
        Write-Host "[secret] $key -> $secretName" -ForegroundColor Yellow
    } else {
        $envVars += "$key=$value"
        Write-Host "[env]    $key=$value" -ForegroundColor Cyan
    }
}

if ($DryRun) {
    Write-Host "`nDry run. Would invoke:" -ForegroundColor Magenta
    if ($secrets.Count -gt 0) {
        $masked = $secrets | ForEach-Object {
            $parts = $_.Split("=", 2); "$($parts[0])=***"
        }
        Write-Host "az containerapp secret set --name $ContainerApp --resource-group $ResourceGroup --secrets $($masked -join ' ')"
    }
    Write-Host "az containerapp update --name $ContainerApp --resource-group $ResourceGroup --set-env-vars $($envVars -join ' ')"
    return
}

if ($secrets.Count -gt 0) {
    Write-Host "`nSetting $($secrets.Count) secret(s)..." -ForegroundColor Green
    az containerapp secret set --name $ContainerApp --resource-group $ResourceGroup --secrets @secrets | Out-Null
}

Write-Host "`nSetting $($envVars.Count) env var(s) (triggers new revision)..." -ForegroundColor Green
az containerapp update --name $ContainerApp --resource-group $ResourceGroup --set-env-vars @envVars | Out-Null

Write-Host "`nDone." -ForegroundColor Green
