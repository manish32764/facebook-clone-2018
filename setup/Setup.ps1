<#
.SYNOPSIS
    One-click setup for the Facebook Clone (2018 edition) on a clean Windows VDI.

.DESCRIPTION
    Installs Git, JDK 21, Node.js LTS, Maven and Docker Desktop, publishes the
    matching environment variables and PATH entries, installs IntelliJ IDEA
    Ultimate and WebStorm (30-day trials), brings the stack up with Docker
    Compose, then opens both projects in their IDE and the app in a browser.

    Safe to re-run: every step detects what is already present and skips it.

.PARAMETER SkipIdes
    Do not install or open IntelliJ IDEA and WebStorm.

.PARAMETER SkipDocker
    Do not install Docker Desktop or start the containers.

.PARAMETER SkipTools
    Skip the toolchain installation and go straight to Docker + IDEs.

.PARAMETER Rebuild
    Force "docker compose up --build" even when images already exist.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File setup\Setup.ps1

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File setup\Setup.ps1 -SkipIdes -Rebuild
#>

[CmdletBinding()]
param(
    [switch]$SkipIdes,
    [switch]$SkipDocker,
    [switch]$SkipTools,
    [switch]$Rebuild
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$SetupRoot = $PSScriptRoot
$ProjectRoot = Split-Path $SetupRoot -Parent
$DownloadDirectory = Join-Path $SetupRoot 'downloads'
$LogDirectory = Join-Path $SetupRoot 'logs'

Import-Module (Join-Path $SetupRoot 'modules\Common.psm1') -Force
Import-Module (Join-Path $SetupRoot 'modules\Prerequisites.psm1') -Force
Import-Module (Join-Path $SetupRoot 'modules\JetBrains.psm1') -Force
Import-Module (Join-Path $SetupRoot 'modules\Project.psm1') -Force

$logFile = Initialize-SetupLog -LogDirectory $LogDirectory

Write-Host ''
Write-Host '  ####  Facebook Clone - 2018 edition' -ForegroundColor Cyan
Write-Host '  ####  React + TypeScript + Vite  |  Java 21 + Spring Boot  |  Docker' -ForegroundColor DarkCyan
Write-Host ''
Write-Host "  Project : $ProjectRoot"
Write-Host "  Log     : $logFile"
Write-Host ''

if (-not (Test-Administrator)) {
    Write-Err 'This script must run as Administrator.'
    Write-Host '  Right-click setup.bat and choose "Run as administrator", or run:' -ForegroundColor Yellow
    Write-Host '    Start-Process powershell -Verb RunAs -ArgumentList "-ExecutionPolicy Bypass -File setup\Setup.ps1"' -ForegroundColor Yellow
    exit 1
}

if (-not (Test-Path $DownloadDirectory)) {
    New-Item -ItemType Directory -Path $DownloadDirectory -Force | Out-Null
}

# TLS 1.2 is not the default on older Windows images and every download needs it.
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$summary = [ordered]@{}
$started = Get-Date

# ---------------------------------------------------------------- toolchain --
if ($SkipTools) {
    Write-Warn2 'Skipping toolchain installation (-SkipTools)'
}
else {
    $toolResults = Install-Prerequisites -DownloadDirectory $DownloadDirectory -SkipDocker:$SkipDocker
    foreach ($key in $toolResults.Keys) {
        $summary[$key] = if ($toolResults[$key]) { 'installed' } else { 'FAILED' }
    }
}

Update-SessionPath

# ------------------------------------------------------------- verification --
Write-Banner 'Verifying the toolchain'

$checks = @(
    @{ Name = 'git';    Command = 'git';    Arguments = @('--version') },
    @{ Name = 'java';   Command = 'java';   Arguments = @('-version') },
    @{ Name = 'javac';  Command = 'javac';  Arguments = @('--version') },
    @{ Name = 'node';   Command = 'node';   Arguments = @('--version') },
    @{ Name = 'npm';    Command = 'npm';    Arguments = @('--version') },
    @{ Name = 'mvn';    Command = 'mvn';    Arguments = @('--version') },
    @{ Name = 'docker'; Command = 'docker'; Arguments = @('--version') }
)

foreach ($check in $checks) {
    if (Test-CommandExists $check.Command) {
        try {
            $output = & $check.Command $check.Arguments 2>&1 | Select-Object -First 1
            Write-Ok "$($check.Name): $output"
        }
        catch {
            Write-Warn2 "$($check.Name) is on PATH but did not respond"
        }
    }
    else {
        Write-Warn2 "$($check.Name) is not on PATH yet (a new terminal usually fixes this)"
    }
}

Write-Host ''
Write-Host "  JAVA_HOME  = $([Environment]::GetEnvironmentVariable('JAVA_HOME', 'Machine'))"
Write-Host "  MAVEN_HOME = $([Environment]::GetEnvironmentVariable('MAVEN_HOME', 'Machine'))"

# --------------------------------------------------------- IDE run configs ---
New-IdeRunConfigurations -ProjectRoot $ProjectRoot

# ------------------------------------------------------------------ docker ---
$stackUp = $false

if ($SkipDocker) {
    Write-Warn2 'Skipping Docker (-SkipDocker)'
}
else {
    if (Start-DockerEngine) {
        if (Invoke-ComposeUp -ProjectRoot $ProjectRoot -Rebuild:$Rebuild) {
            $stackUp = Test-Stack -FrontendPort 3000 -BackendPort 8080
            $summary['Docker stack'] = if ($stackUp) { 'running' } else { 'started, health check timed out' }
        }
        else {
            $summary['Docker stack'] = 'FAILED'
        }
    }
    else {
        $summary['Docker stack'] = 'engine not ready'
    }
}

# -------------------------------------------------------------------- IDEs ---
if ($SkipIdes) {
    Write-Warn2 'Skipping IDE installation (-SkipIdes)'
}
else {
    $wingetAvailable = Test-Winget
    $ides = Install-JetBrainsIdes -DownloadDirectory $DownloadDirectory -WingetAvailable $wingetAvailable

    $summary['IntelliJ IDEA Ultimate'] = if ($ides.Idea) { 'installed' } else { 'FAILED' }
    $summary['WebStorm'] = if ($ides.WebStorm) { 'installed' } else { 'FAILED' }

    Write-Banner 'Opening the projects'
    Open-InIde -IdeExecutable $ides.Idea -ProjectPath (Join-Path $ProjectRoot 'backend') -Label 'backend' | Out-Null
    Open-InIde -IdeExecutable $ides.WebStorm -ProjectPath (Join-Path $ProjectRoot 'frontend') -Label 'frontend' | Out-Null
}

# ----------------------------------------------------------------- browser ---
if ($stackUp) {
    Write-Step 'Opening http://localhost:3000 in your browser'
    Start-Process 'http://localhost:3000'
}

# ----------------------------------------------------------------- summary ---
$elapsed = (Get-Date) - $started

Write-Banner 'Setup complete'
foreach ($key in $summary.Keys) {
    $value = $summary[$key]
    $colour = if ($value -match 'FAILED|not ready') { 'Red' } else { 'Green' }
    Write-Host ("  {0,-26} {1}" -f $key, $value) -ForegroundColor $colour
}

Write-Host ''
Write-Host '  App        http://localhost:3000' -ForegroundColor Cyan
Write-Host '  API        http://localhost:8080/api' -ForegroundColor Cyan
Write-Host '  Health     http://localhost:8080/actuator/health' -ForegroundColor Cyan
Write-Host '  Postgres   localhost:5432  (fbclone / fbclone)' -ForegroundColor Cyan
Write-Host ''
Write-Host '  Demo login mark@facebook.dev  /  password123' -ForegroundColor Yellow
Write-Host ''
Write-Host ("  Finished in {0:mm\:ss}" -f $elapsed)
Write-Host "  Full log: $logFile"
Write-Host ''
Write-Host '  NOTE: IntelliJ IDEA Ultimate and WebStorm open on the trial screen.' -ForegroundColor DarkYellow
Write-Host '        Sign in with a JetBrains account and choose "Start trial".' -ForegroundColor DarkYellow
Write-Host ''
