<#
.SYNOPSIS
    Day-to-day helper: start, stop, rebuild or inspect the Docker stack.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File setup\Start.ps1 up
    powershell -ExecutionPolicy Bypass -File setup\Start.ps1 rebuild
    powershell -ExecutionPolicy Bypass -File setup\Start.ps1 logs backend
    powershell -ExecutionPolicy Bypass -File setup\Start.ps1 reset
#>

[CmdletBinding()]
param(
    [ValidateSet('up', 'down', 'restart', 'rebuild', 'logs', 'status', 'reset')]
    [string]$Action = 'up',

    [string]$Service
)

$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path $PSScriptRoot -Parent

Import-Module (Join-Path $PSScriptRoot 'modules\Common.psm1') -Force
Import-Module (Join-Path $PSScriptRoot 'modules\Project.psm1') -Force

Push-Location $ProjectRoot
try {
    switch ($Action) {
        'up' {
            Start-DockerEngine | Out-Null
            docker compose up -d
            Test-Stack | Out-Null
            Start-Process 'http://localhost:3000'
        }
        'down' {
            docker compose down
            Write-Ok 'Containers stopped (database volume kept)'
        }
        'restart' {
            docker compose restart
            Write-Ok 'Containers restarted'
        }
        'rebuild' {
            docker compose up -d --build
            Test-Stack | Out-Null
        }
        'logs' {
            if ($Service) { docker compose logs -f $Service } else { docker compose logs -f }
        }
        'status' {
            docker compose ps
        }
        'reset' {
            Write-Warn2 'This deletes the database volume and re-seeds on next start.'
            $answer = Read-Host 'Type YES to continue'
            if ($answer -eq 'YES') {
                docker compose down -v
                docker compose up -d --build
                Test-Stack | Out-Null
                Write-Ok 'Stack reset with fresh demo data'
            }
            else {
                Write-Host 'Cancelled.'
            }
        }
    }
}
finally {
    Pop-Location
}
