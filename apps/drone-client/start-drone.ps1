$droneProcess = Get-Process "falcon-drone" -ErrorAction SilentlyContinue

if ($droneProcess) {
    Write-Host "Falcon drone client is already running."
    exit 0
}

$executable = Join-Path $PSScriptRoot "build\Release\falcon-drone.exe"

if (-not (Test-Path $executable)) {
    Write-Error "Drone executable was not found at: $executable"
    exit 1
}

Write-Host "Starting Falcon drone client..."
Start-Process `
    -FilePath $executable `
    -WorkingDirectory $PSScriptRoot

Write-Host "Falcon drone client started."