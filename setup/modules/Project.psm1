<#
.SYNOPSIS
    Brings the stack up with Docker Compose and generates the IDE run
    configurations that IntelliJ and WebStorm pick up automatically.
#>

# No -Force here: it would unload Common from the caller's scope,
# taking Write-Ok / Test-Administrator with it in Setup.ps1.
if (-not (Get-Module -Name 'Common')) {
    Import-Module (Join-Path $PSScriptRoot 'Common.psm1')
}

function Start-DockerEngine {
    param([int]$TimeoutSeconds = 300)

    Write-Banner 'Starting Docker'

    if (-not (Test-CommandExists 'docker')) {
        Write-Err 'docker is not on PATH - open a new terminal after Docker Desktop finishes installing'
        return $false
    }

    docker info 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Ok 'Docker engine is already running'
        return $true
    }

    $desktop = Join-Path $env:ProgramFiles 'Docker\Docker\Docker Desktop.exe'
    if (Test-Path $desktop) {
        Write-Step 'Launching Docker Desktop'
        Start-Process -FilePath $desktop
    }
    else {
        Write-Warn2 'Docker Desktop executable not found - start it manually'
    }

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    Write-Step 'Waiting for the Docker engine to accept connections'

    while ((Get-Date) -lt $deadline) {
        Start-Sleep -Seconds 5
        docker info 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Ok 'Docker engine is ready'
            return $true
        }
    }

    Write-Err "Docker did not become ready within $TimeoutSeconds seconds"
    return $false
}

function Invoke-ComposeUp {
    param(
        [Parameter(Mandatory)][string]$ProjectRoot,
        [switch]$Rebuild
    )

    Write-Banner 'docker compose up'

    Push-Location $ProjectRoot
    try {
        $arguments = @('compose', 'up', '-d')
        if ($Rebuild) { $arguments += '--build' }

        Write-Step ('docker ' + ($arguments -join ' '))
        & docker @arguments

        if ($LASTEXITCODE -ne 0) {
            Write-Err "docker compose exited with code $LASTEXITCODE"
            return $false
        }

        Write-Ok 'Containers started'
        & docker compose ps
        return $true
    }
    finally {
        Pop-Location
    }
}

<#
    Writes .run/*.run.xml files. IntelliJ and WebStorm both read this folder
    on project open, so the run configurations exist before the first launch.
#>
function New-IdeRunConfigurations {
    param([Parameter(Mandatory)][string]$ProjectRoot)

    Write-Banner 'Generating IDE run configurations'

    $backendRunDir = Join-Path $ProjectRoot 'backend\.run'
    $frontendRunDir = Join-Path $ProjectRoot 'frontend\.run'

    foreach ($dir in @($backendRunDir, $frontendRunDir)) {
        if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    }

    $springRun = @(
        '<component name="ProjectRunConfigurationManager">',
        '  <configuration default="false" name="Backend (Spring Boot, H2)" type="SpringBootApplicationConfigurationType" factoryName="Spring Boot">',
        '    <option name="MAIN_CLASS_NAME" value="com.facebookclone.FacebookCloneApplication" />',
        '    <module name="facebook-clone-api" />',
        '    <option name="ACTIVE_PROFILES" value="local" />',
        '    <method v="2">',
        '      <option name="Make" enabled="true" />',
        '    </method>',
        '  </configuration>',
        '</component>'
    ) -join [Environment]::NewLine

    $mavenRun = @(
        '<component name="ProjectRunConfigurationManager">',
        '  <configuration default="false" name="Backend (mvn spring-boot:run)" type="MavenRunConfiguration" factoryName="Maven">',
        '    <MavenSettings>',
        '      <option name="myGeneralSettings" />',
        '      <option name="myRunnerSettings" />',
        '      <option name="myRunnerParameters">',
        '        <MavenRunnerParameters>',
        '          <option name="commandLine" value="spring-boot:run -Dspring-boot.run.profiles=local" />',
        '          <option name="workingDirPath" value="$PROJECT_DIR$" />',
        '        </MavenRunnerParameters>',
        '      </option>',
        '    </MavenSettings>',
        '    <method v="2" />',
        '  </configuration>',
        '</component>'
    ) -join [Environment]::NewLine

    $viteRun = @(
        '<component name="ProjectRunConfigurationManager">',
        '  <configuration default="false" name="Frontend (vite dev)" type="js.build_tools.npm">',
        '    <package-json value="$PROJECT_DIR$/package.json" />',
        '    <command value="run" />',
        '    <scripts>',
        '      <script value="dev" />',
        '    </scripts>',
        '    <node-interpreter value="project" />',
        '    <method v="2" />',
        '  </configuration>',
        '</component>'
    ) -join [Environment]::NewLine

    $buildRun = @(
        '<component name="ProjectRunConfigurationManager">',
        '  <configuration default="false" name="Frontend (build)" type="js.build_tools.npm">',
        '    <package-json value="$PROJECT_DIR$/package.json" />',
        '    <command value="run" />',
        '    <scripts>',
        '      <script value="build" />',
        '    </scripts>',
        '    <node-interpreter value="project" />',
        '    <method v="2" />',
        '  </configuration>',
        '</component>'
    ) -join [Environment]::NewLine

    Set-Content -Path (Join-Path $backendRunDir 'Backend-SpringBoot.run.xml') -Value $springRun -Encoding utf8
    Set-Content -Path (Join-Path $backendRunDir 'Backend-Maven.run.xml') -Value $mavenRun -Encoding utf8
    Set-Content -Path (Join-Path $frontendRunDir 'Frontend-Dev.run.xml') -Value $viteRun -Encoding utf8
    Set-Content -Path (Join-Path $frontendRunDir 'Frontend-Build.run.xml') -Value $buildRun -Encoding utf8

    Write-Ok 'Run configurations written to backend\.run and frontend\.run'
}

function Test-Stack {
    param(
        [int]$FrontendPort = 3000,
        [int]$BackendPort = 8080
    )

    Write-Banner 'Verifying the running stack'

    $apiUp = Wait-ForHttp -Url "http://localhost:$BackendPort/actuator/health" -TimeoutSeconds 240 -Description 'backend API'
    $webUp = Wait-ForHttp -Url "http://localhost:$FrontendPort/" -TimeoutSeconds 180 -Description 'frontend'

    return ($apiUp -and $webUp)
}

Export-ModuleMember -Function Start-DockerEngine, Invoke-ComposeUp, New-IdeRunConfigurations, Test-Stack
