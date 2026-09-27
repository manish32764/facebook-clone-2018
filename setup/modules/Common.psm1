<#
.SYNOPSIS
    Shared helpers for the Facebook Clone one-click setup: logging, elevation,
    downloads, and machine-level environment variable management.
#>

$script:LogFile = $null

function Initialize-SetupLog {
    param([Parameter(Mandatory)][string]$LogDirectory)

    if (-not (Test-Path $LogDirectory)) {
        New-Item -ItemType Directory -Path $LogDirectory -Force | Out-Null
    }

    $stamp = Get-Date -Format 'yyyy-MM-dd_HH-mm-ss'
    $script:LogFile = Join-Path $LogDirectory "setup_$stamp.log"
    "Facebook Clone setup started $(Get-Date -Format 'u')" | Out-File -FilePath $script:LogFile -Encoding utf8
    return $script:LogFile
}

function Write-Log {
    param([string]$Message, [string]$Level = 'INFO')

    $line = "[{0}] [{1}] {2}" -f (Get-Date -Format 'HH:mm:ss'), $Level, $Message
    if ($script:LogFile) {
        Add-Content -Path $script:LogFile -Value $line -Encoding utf8
    }
}

function Write-Banner {
    param([string]$Text)

    $bar = '=' * 74
    Write-Host ''
    Write-Host $bar -ForegroundColor DarkCyan
    Write-Host ("  " + $Text) -ForegroundColor Cyan
    Write-Host $bar -ForegroundColor DarkCyan
    Write-Log $Text 'BANNER'
}

function Write-Step {
    param([string]$Text)
    Write-Host ("  -> " + $Text) -ForegroundColor White
    Write-Log $Text 'STEP'
}

function Write-Ok {
    param([string]$Text)
    Write-Host ("  [OK] " + $Text) -ForegroundColor Green
    Write-Log $Text 'OK'
}

function Write-Warn2 {
    param([string]$Text)
    Write-Host ("  [!]  " + $Text) -ForegroundColor Yellow
    Write-Log $Text 'WARN'
}

function Write-Err {
    param([string]$Text)
    Write-Host ("  [X]  " + $Text) -ForegroundColor Red
    Write-Log $Text 'ERROR'
}

function Test-Administrator {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Test-CommandExists {
    param([Parameter(Mandatory)][string]$Name)
    return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

<#
    Machine PATH changes are invisible to the already-running process, so pull
    the current machine + user PATH back into this session after every install.
#>
function Update-SessionPath {
    $machine = [Environment]::GetEnvironmentVariable('Path', 'Machine')
    $user = [Environment]::GetEnvironmentVariable('Path', 'User')
    $env:Path = ($machine, $user | Where-Object { $_ }) -join ';'
}

function Set-MachineVariable {
    param(
        [Parameter(Mandatory)][string]$Name,
        [Parameter(Mandatory)][string]$Value
    )

    $current = [Environment]::GetEnvironmentVariable($Name, 'Machine')
    if ($current -eq $Value) {
        Write-Ok "$Name already set to $Value"
        return
    }

    [Environment]::SetEnvironmentVariable($Name, $Value, 'Machine')
    Set-Item -Path "Env:$Name" -Value $Value
    Write-Ok "$Name = $Value"
}

function Add-MachinePathEntry {
    param([Parameter(Mandatory)][string]$Directory)

    if (-not (Test-Path $Directory)) {
        Write-Warn2 "Skipping PATH entry that does not exist: $Directory"
        return
    }

    $machinePath = [Environment]::GetEnvironmentVariable('Path', 'Machine')
    $entries = $machinePath -split ';' | Where-Object { $_ }

    if ($entries -contains $Directory) {
        Write-Ok "PATH already contains $Directory"
        return
    }

    $updated = (($entries + $Directory) -join ';')
    [Environment]::SetEnvironmentVariable('Path', $updated, 'Machine')
    Update-SessionPath
    Write-Ok "Added to PATH: $Directory"
}

function Invoke-FileDownload {
    param(
        [Parameter(Mandatory)][string]$Url,
        [Parameter(Mandatory)][string]$Destination,
        [int]$MaxAttempts = 3
    )

    if (Test-Path $Destination) {
        $existing = (Get-Item $Destination).Length
        if ($existing -gt 1MB) {
            Write-Ok "Using cached download: $(Split-Path $Destination -Leaf)"
            return $true
        }
        Remove-Item $Destination -Force -ErrorAction SilentlyContinue
    }

    $parent = Split-Path $Destination -Parent
    if (-not (Test-Path $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }

    for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
        try {
            Write-Step "Downloading $(Split-Path $Destination -Leaf) (attempt $attempt of $MaxAttempts)"
            $previous = $ProgressPreference
            $ProgressPreference = 'SilentlyContinue'   # Invoke-WebRequest is far faster without the progress bar
            Invoke-WebRequest -Uri $Url -OutFile $Destination -UseBasicParsing -TimeoutSec 1800
            $ProgressPreference = $previous
            Write-Ok "Downloaded $(Split-Path $Destination -Leaf)"
            return $true
        }
        catch {
            Write-Warn2 "Download failed: $($_.Exception.Message)"
            Start-Sleep -Seconds (5 * $attempt)
        }
    }

    Write-Err "Giving up on $Url"
    return $false
}

function Wait-ForHttp {
    param(
        [Parameter(Mandatory)][string]$Url,
        [int]$TimeoutSeconds = 300,
        [string]$Description = 'service'
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    Write-Step "Waiting for $Description at $Url"

    while ((Get-Date) -lt $deadline) {
        try {
            $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 400) {
                Write-Ok "$Description is up"
                return $true
            }
        }
        catch {
            Start-Sleep -Seconds 5
        }
    }

    Write-Warn2 "$Description did not respond within $TimeoutSeconds seconds"
    return $false
}

Export-ModuleMember -Function Initialize-SetupLog, Write-Log, Write-Banner, Write-Step, Write-Ok,
    Write-Warn2, Write-Err, Test-Administrator, Test-CommandExists, Update-SessionPath,
    Set-MachineVariable, Add-MachinePathEntry, Invoke-FileDownload, Wait-ForHttp
