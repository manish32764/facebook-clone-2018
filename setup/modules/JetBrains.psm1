<#
.SYNOPSIS
    Installs the latest IntelliJ IDEA Ultimate and WebStorm, then opens the
    backend and frontend in them.

.NOTES
    Both products install as a 30-day trial. JetBrains licensing cannot be
    activated from a script - the first launch shows the "Start trial" screen
    and the user signs in with a JetBrains account there.
#>

# No -Force here: it would unload Common from the caller's scope,
# taking Write-Ok / Test-Administrator with it in Setup.ps1.
if (-not (Get-Module -Name 'Common')) {
    Import-Module (Join-Path $PSScriptRoot 'Common.psm1')
}

# JetBrains product codes used by their public releases feed.
$script:Products = @{
    'IntelliJ IDEA Ultimate' = @{
        Code      = 'IIU'
        WingetId  = 'JetBrains.IntelliJIDEA.Ultimate'
        Executable = 'idea64.exe'
        FolderHint = 'IntelliJ IDEA'
    }
    'WebStorm' = @{
        Code      = 'WS'
        WingetId  = 'JetBrains.WebStorm'
        Executable = 'webstorm64.exe'
        FolderHint = 'WebStorm'
    }
}

<#
    Searches the standard install locations plus JetBrains Toolbox for a
    product launcher. Returns the full path, or $null.
#>
function Find-JetBrainsExecutable {
    param([Parameter(Mandatory)][string]$Executable)

    $roots = @(
        (Join-Path $env:ProgramFiles 'JetBrains'),
        (Join-Path ${env:ProgramFiles(x86)} 'JetBrains'),
        (Join-Path $env:LOCALAPPDATA 'JetBrains'),
        (Join-Path $env:LOCALAPPDATA 'Programs')
    )

    foreach ($root in $roots) {
        if (-not $root -or -not (Test-Path $root)) { continue }

        $found = Get-ChildItem -Path $root -Filter $Executable -Recurse -ErrorAction SilentlyContinue |
            Sort-Object LastWriteTime -Descending |
            Select-Object -First 1

        if ($found) { return $found.FullName }
    }

    return $null
}

<#
    Asks the JetBrains releases API for the current Windows installer URL.
    This is the fallback path when winget is unavailable on the VDI.
#>
function Get-JetBrainsDownloadUrl {
    param([Parameter(Mandatory)][string]$ProductCode)

    $api = "https://data.services.jetbrains.com/products/releases?code=$ProductCode&latest=true&type=release"

    try {
        $response = Invoke-RestMethod -Uri $api -UseBasicParsing -TimeoutSec 60
        $release = $response.$ProductCode[0]
        $link = $release.downloads.windows.link

        if ($link) {
            Write-Ok "$ProductCode latest release is $($release.version)"
            return $link
        }
    }
    catch {
        Write-Warn2 "JetBrains release feed unavailable: $($_.Exception.Message)"
    }

    return $null
}

function Install-JetBrainsProduct {
    param(
        [Parameter(Mandatory)][string]$Name,
        [Parameter(Mandatory)][string]$DownloadDirectory,
        [bool]$WingetAvailable = $true
    )

    $product = $script:Products[$Name]
    if (-not $product) {
        Write-Err "Unknown JetBrains product: $Name"
        return $null
    }

    $existing = Find-JetBrainsExecutable -Executable $product.Executable
    if ($existing) {
        Write-Ok "$Name already installed at $existing"
        return $existing
    }

    Write-Banner "Installing $Name (30-day trial)"

    if ($WingetAvailable) {
        $arguments = @(
            'install', '--id', $product.WingetId,
            '--exact', '--silent',
            '--accept-package-agreements', '--accept-source-agreements',
            '--disable-interactivity'
        )
        $process = Start-Process -FilePath 'winget' -ArgumentList $arguments -Wait -PassThru -NoNewWindow

        if ($process.ExitCode -eq 0 -or $process.ExitCode -eq -1978335189) {
            $path = Find-JetBrainsExecutable -Executable $product.Executable
            if ($path) {
                Write-Ok "$Name installed"
                return $path
            }
        }
        Write-Warn2 "winget could not install $Name (exit $($process.ExitCode)) - trying direct download"
    }

    $url = Get-JetBrainsDownloadUrl -ProductCode $product.Code
    if (-not $url) {
        Write-Err "No download URL for $Name"
        return $null
    }

    $installer = Join-Path $DownloadDirectory ("{0}-installer.exe" -f ($Name -replace '\s', '-'))
    if (-not (Invoke-FileDownload -Url $url -Destination $installer)) { return $null }

    Write-Step "Running the $Name installer silently (this takes a few minutes)"

    # JetBrains installers are NSIS-based: /S is silent, /D must come last and be unquoted.
    $targetDir = Join-Path $env:ProgramFiles ('JetBrains\' + $product.FolderHint)
    $silentArgs = '/S /CONFIG=silent.config /D=' + $targetDir

    $process = Start-Process -FilePath $installer -ArgumentList $silentArgs -Wait -PassThru

    if ($process.ExitCode -ne 0) {
        Write-Warn2 "$Name installer exit code $($process.ExitCode)"
    }

    $path = Find-JetBrainsExecutable -Executable $product.Executable
    if ($path) {
        Write-Ok "$Name installed at $path"
        return $path
    }

    Write-Err "$Name did not install - open $installer manually"
    return $null
}

function Install-JetBrainsIdes {
    param(
        [Parameter(Mandatory)][string]$DownloadDirectory,
        [bool]$WingetAvailable = $true
    )

    return [ordered]@{
        Idea     = Install-JetBrainsProduct -Name 'IntelliJ IDEA Ultimate' -DownloadDirectory $DownloadDirectory -WingetAvailable $WingetAvailable
        WebStorm = Install-JetBrainsProduct -Name 'WebStorm' -DownloadDirectory $DownloadDirectory -WingetAvailable $WingetAvailable
    }
}

function Open-InIde {
    param(
        [Parameter(Mandatory)][string]$IdeExecutable,
        [Parameter(Mandatory)][string]$ProjectPath,
        [Parameter(Mandatory)][string]$Label
    )

    if (-not $IdeExecutable -or -not (Test-Path $IdeExecutable)) {
        Write-Warn2 "$Label was not opened - IDE executable not found"
        return $false
    }

    if (-not (Test-Path $ProjectPath)) {
        Write-Warn2 "$Label was not opened - project path missing: $ProjectPath"
        return $false
    }

    Write-Step "Opening $Label in $(Split-Path $IdeExecutable -Leaf)"
    Start-Process -FilePath $IdeExecutable -ArgumentList ('"' + $ProjectPath + '"')
    Write-Ok "$Label opening (first launch asks you to start the trial)"
    return $true
}

Export-ModuleMember -Function Install-JetBrainsIdes, Install-JetBrainsProduct, Find-JetBrainsExecutable, Get-JetBrainsDownloadUrl, Open-InIde
