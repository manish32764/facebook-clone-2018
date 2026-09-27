<#
.SYNOPSIS
    Installs the toolchain the project needs: Git, JDK 21, Node.js LTS, Maven
    and Docker Desktop. Prefers winget; falls back to direct vendor downloads
    on a clean VDI where the App Installer is missing.
#>

# No -Force here: it would unload Common from the caller's scope,
# taking Write-Ok / Test-Administrator with it in Setup.ps1.
if (-not (Get-Module -Name 'Common')) {
    Import-Module (Join-Path $PSScriptRoot 'Common.psm1')
}

function Test-Winget {
    if (Test-CommandExists 'winget') {
        Write-Ok 'winget is available'
        return $true
    }
    Write-Warn2 'winget not found - falling back to direct downloads'
    return $false
}

function Install-WithWinget {
    param(
        [Parameter(Mandatory)][string]$PackageId,
        [Parameter(Mandatory)][string]$DisplayName,
        [string[]]$ExtraArgs = @()
    )

    Write-Step "winget install $PackageId"

    $arguments = @(
        'install', '--id', $PackageId,
        '--exact', '--silent',
        '--accept-package-agreements', '--accept-source-agreements',
        '--disable-interactivity'
    ) + $ExtraArgs

    $process = Start-Process -FilePath 'winget' -ArgumentList $arguments -Wait -PassThru -NoNewWindow

    # 0 = installed, -1978335189 (0x8A15002B) = already installed and up to date.
    if ($process.ExitCode -eq 0 -or $process.ExitCode -eq -1978335189) {
        Write-Ok "$DisplayName ready"
        Update-SessionPath
        return $true
    }

    Write-Warn2 "$DisplayName winget exit code $($process.ExitCode)"
    return $false
}

function Install-FromUrl {
    param(
        [Parameter(Mandatory)][string]$Url,
        [Parameter(Mandatory)][string]$FileName,
        [Parameter(Mandatory)][string]$DisplayName,
        [Parameter(Mandatory)][string]$DownloadDirectory,
        [string[]]$SilentArgs = @('/quiet', '/norestart')
    )

    $installer = Join-Path $DownloadDirectory $FileName
    if (-not (Invoke-FileDownload -Url $Url -Destination $installer)) { return $false }

    Write-Step "Installing $DisplayName"

    if ($FileName -like '*.msi') {
        $msiArgs = @('/i', ('"' + $installer + '"')) + $SilentArgs
        $process = Start-Process -FilePath 'msiexec.exe' -ArgumentList $msiArgs -Wait -PassThru
    }
    else {
        $process = Start-Process -FilePath $installer -ArgumentList $SilentArgs -Wait -PassThru
    }

    if ($process.ExitCode -eq 0 -or $process.ExitCode -eq 3010) {
        Write-Ok "$DisplayName installed"
        Update-SessionPath
        return $true
    }

    Write-Err "$DisplayName installer exit code $($process.ExitCode)"
    return $false
}

<#
    Installs one tool: skips it when the verification command already works,
    then tries winget, then the vendor URL.
#>
function Install-Tool {
    param(
        [Parameter(Mandatory)][string]$DisplayName,
        [Parameter(Mandatory)][string]$VerifyCommand,
        [string]$WingetId,
        [string]$FallbackUrl,
        [string]$FallbackFileName,
        [string[]]$FallbackArgs = @('/quiet', '/norestart'),
        [Parameter(Mandatory)][string]$DownloadDirectory,
        [bool]$WingetAvailable = $true
    )

    Update-SessionPath

    if (Test-CommandExists $VerifyCommand) {
        Write-Ok "$DisplayName already installed"
        return $true
    }

    Write-Banner "Installing $DisplayName"

    if ($WingetAvailable -and $WingetId) {
        if (Install-WithWinget -PackageId $WingetId -DisplayName $DisplayName) {
            Update-SessionPath
            return $true
        }
    }

    if ($FallbackUrl -and $FallbackFileName) {
        $installed = Install-FromUrl -Url $FallbackUrl -FileName $FallbackFileName -DisplayName $DisplayName -DownloadDirectory $DownloadDirectory -SilentArgs $FallbackArgs
        if ($installed) {
            Update-SessionPath
            return $true
        }
    }

    Write-Err "Could not install $DisplayName automatically"
    return $false
}

<#
    Finds the JDK that was just installed and publishes JAVA_HOME + PATH.
    Looks at the registry first, then the usual Program Files locations.
#>
function Set-JavaEnvironment {
    Write-Banner 'Configuring JAVA_HOME'

    $candidates = @()

    $registryRoots = @(
        'HKLM:\SOFTWARE\Eclipse Adoptium\JDK',
        'HKLM:\SOFTWARE\JavaSoft\JDK',
        'HKLM:\SOFTWARE\Eclipse Foundation\JDK'
    )

    foreach ($root in $registryRoots) {
        if (Test-Path $root) {
            Get-ChildItem $root -ErrorAction SilentlyContinue | ForEach-Object {
                $msiKey = Join-Path $_.PSPath 'hotspot\MSI'
                $installPath = (Get-ItemProperty $msiKey -ErrorAction SilentlyContinue).Path
                if ($installPath) { $candidates += $installPath.TrimEnd('\') }
            }
        }
    }

    $searchRoots = @(
        (Join-Path $env:ProgramFiles 'Eclipse Adoptium'),
        (Join-Path $env:ProgramFiles 'Java'),
        (Join-Path $env:ProgramFiles 'Microsoft'),
        (Join-Path $env:ProgramFiles 'Amazon Corretto')
    )

    foreach ($root in $searchRoots) {
        if (Test-Path $root) {
            Get-ChildItem $root -Directory -Recurse -Depth 1 -ErrorAction SilentlyContinue |
                Where-Object { Test-Path (Join-Path $_.FullName 'bin\javac.exe') } |
                ForEach-Object { $candidates += $_.FullName }
        }
    }

    $unique = $candidates | Where-Object { $_ } | Sort-Object -Unique

    # Prefer a 21.x JDK; otherwise take the highest-sorting install found.
    $chosen = $unique | Where-Object { $_ -match '21' } | Sort-Object -Descending | Select-Object -First 1
    if (-not $chosen) {
        $chosen = $unique | Sort-Object -Descending | Select-Object -First 1
    }

    if (-not $chosen) {
        Write-Err 'No JDK installation directory found - set JAVA_HOME manually'
        return $false
    }

    Set-MachineVariable -Name 'JAVA_HOME' -Value $chosen
    Add-MachinePathEntry -Directory (Join-Path $chosen 'bin')
    return $true
}

function Set-MavenEnvironment {
    Write-Banner 'Configuring MAVEN_HOME'

    $mavenCommand = Get-Command 'mvn' -ErrorAction SilentlyContinue
    $mavenHome = $null

    if ($mavenCommand) {
        # ...\apache-maven-3.9.x\bin\mvn.cmd -> ...\apache-maven-3.9.x
        $mavenHome = Split-Path (Split-Path $mavenCommand.Source -Parent) -Parent
    }
    else {
        $roots = @(
            (Join-Path $env:ProgramFiles 'Apache\Maven'),
            (Join-Path $env:ProgramData 'chocolatey\lib\maven\apache-maven')
        )
        foreach ($root in $roots) {
            if (Test-Path $root) {
                $found = Get-ChildItem $root -Directory -Filter 'apache-maven-*' -ErrorAction SilentlyContinue |
                    Sort-Object Name -Descending | Select-Object -First 1
                if ($found) { $mavenHome = $found.FullName; break }
                if (Test-Path (Join-Path $root 'bin\mvn.cmd')) { $mavenHome = $root; break }
            }
        }
    }

    if (-not $mavenHome) {
        Write-Warn2 'Maven not located - the Docker build does not need it, skipping'
        return $false
    }

    Set-MachineVariable -Name 'MAVEN_HOME' -Value $mavenHome
    Set-MachineVariable -Name 'M2_HOME' -Value $mavenHome
    Add-MachinePathEntry -Directory (Join-Path $mavenHome 'bin')
    return $true
}

function Set-NodeEnvironment {
    Write-Banner 'Configuring Node.js'

    $nodeCommand = Get-Command 'node' -ErrorAction SilentlyContinue
    if (-not $nodeCommand) {
        Write-Warn2 'node not on PATH yet - it usually appears after a new shell'
        return $false
    }

    $nodeHome = Split-Path $nodeCommand.Source -Parent
    Add-MachinePathEntry -Directory $nodeHome

    # npm global installs land here; without it, global CLIs are not runnable.
    $npmGlobal = Join-Path $env:APPDATA 'npm'
    if (Test-Path $npmGlobal) {
        $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
        if ($userPath -notlike "*$npmGlobal*") {
            [Environment]::SetEnvironmentVariable('Path', ($userPath + ';' + $npmGlobal), 'User')
            Update-SessionPath
            Write-Ok 'Added npm global bin to user PATH'
        }
    }

    $nodeVersion = & node --version
    $npmVersion = & npm --version
    Write-Ok "Node $nodeVersion / npm $npmVersion"
    return $true
}

function Install-Prerequisites {
    param(
        [Parameter(Mandatory)][string]$DownloadDirectory,
        [switch]$SkipDocker
    )

    $wingetAvailable = Test-Winget
    $results = [ordered]@{}

    $results['Git'] = Install-Tool -DisplayName 'Git' -VerifyCommand 'git' -WingetId 'Git.Git' -FallbackUrl 'https://github.com/git-for-windows/git/releases/download/v2.47.1.windows.1/Git-2.47.1-64-bit.exe' -FallbackFileName 'Git-64-bit.exe' -FallbackArgs @('/VERYSILENT', '/NORESTART', '/NOCANCEL', '/SP-') -DownloadDirectory $DownloadDirectory -WingetAvailable $wingetAvailable

    $results['JDK 21'] = Install-Tool -DisplayName 'Eclipse Temurin JDK 21' -VerifyCommand 'javac' -WingetId 'EclipseAdoptium.Temurin.21.JDK' -FallbackUrl 'https://api.adoptium.net/v3/installer/latest/21/ga/windows/x64/jdk/hotspot/normal/eclipse?project=jdk' -FallbackFileName 'temurin-jdk21.msi' -FallbackArgs @('/quiet', '/norestart', 'ADDLOCAL=FeatureMain,FeatureEnvironment,FeatureJarFileRunWith,FeatureJavaHome') -DownloadDirectory $DownloadDirectory -WingetAvailable $wingetAvailable

    $results['Node.js'] = Install-Tool -DisplayName 'Node.js LTS' -VerifyCommand 'node' -WingetId 'OpenJS.NodeJS.LTS' -FallbackUrl 'https://nodejs.org/dist/v20.18.1/node-v20.18.1-x64.msi' -FallbackFileName 'node-lts-x64.msi' -DownloadDirectory $DownloadDirectory -WingetAvailable $wingetAvailable

    $results['Maven'] = Install-Tool -DisplayName 'Apache Maven' -VerifyCommand 'mvn' -WingetId 'Apache.Maven' -DownloadDirectory $DownloadDirectory -WingetAvailable $wingetAvailable

    if (-not $SkipDocker) {
        $results['Docker Desktop'] = Install-Tool -DisplayName 'Docker Desktop' -VerifyCommand 'docker' -WingetId 'Docker.DockerDesktop' -FallbackUrl 'https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe' -FallbackFileName 'DockerDesktopInstaller.exe' -FallbackArgs @('install', '--quiet', '--accept-license') -DownloadDirectory $DownloadDirectory -WingetAvailable $wingetAvailable
    }

    Set-JavaEnvironment | Out-Null
    Set-MavenEnvironment | Out-Null
    Set-NodeEnvironment | Out-Null

    return $results
}

Export-ModuleMember -Function Install-Prerequisites, Install-Tool, Install-WithWinget, Install-FromUrl, Set-JavaEnvironment, Set-MavenEnvironment, Set-NodeEnvironment, Test-Winget
