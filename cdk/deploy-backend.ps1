param(
    [string]$Target = "all",
    [int]$MaxRetries = 3,
    [int]$RetryDelay = 5
)

function Invoke-CommandWithRetry {
    param(
        [string]$Description,
        [scriptblock]$Command,
        [int]$MaxRetries = 3,
        [int]$RetryDelay = 5
    )
    
    $attempt = 1
    while ($attempt -le $MaxRetries) {
        Write-Host "Attempt $attempt/$MaxRetries : $Description" -ForegroundColor Cyan
        try {
            $result = & $Command
            if ($LASTEXITCODE -eq 0) {
                Write-Host "SUCCESS: $Description succeeded" -ForegroundColor Green
                return $true
            } else {
                Write-Host "FAILED: $Description failed with exit code $LASTEXITCODE" -ForegroundColor Red
                if ($attempt -lt $MaxRetries) {
                    Write-Host "Retrying in $RetryDelay seconds..." -ForegroundColor Yellow
                    Start-Sleep -Seconds $RetryDelay
                }
            }
        }
        catch {
            Write-Host "FAILED: $Description failed: $_" -ForegroundColor Red
            if ($attempt -lt $MaxRetries) {
                Write-Host "Retrying in $RetryDelay seconds..." -ForegroundColor Yellow
                Start-Sleep -Seconds $RetryDelay
            }
        }
        $attempt++
    }
    
    Write-Host "FAILED: Command failed after $MaxRetries attempts: $Description" -ForegroundColor Red
    return $false
}

Write-Host "JalSaathi Deployment Started" -ForegroundColor Magenta
Write-Host "================================" -ForegroundColor Magenta

# Load environment variables from .env file
Write-Host "Loading environment variables from .env..." -ForegroundColor Yellow
$envFile = Join-Path -Path (Get-Location) -ChildPath ".env"
if (Test-Path $envFile) {
    $content = Get-Content $envFile
    $loadedCount = 0
    foreach ($line in $content) {
        $trimmedLine = $line.Trim()
        if ($trimmedLine -and -not $trimmedLine.StartsWith("#")) {
            $parts = $trimmedLine -split '=', 2
            if ($parts.Count -eq 2) {
                $key = $parts[0].Trim()
                $value = $parts[1].Trim()
                # Remove quotes if present
                if ($value.StartsWith('"') -and $value.EndsWith('"')) {
                    $value = $value.Substring(1, $value.Length - 2)
                }
                [Environment]::SetEnvironmentVariable($key, $value, "Process")
                $loadedCount++
            }
        }
    }
    Write-Host "Loaded $loadedCount environment variables from .env" -ForegroundColor Green
}
else {
    Write-Host ".env file not found in current directory" -ForegroundColor Yellow
}

Write-Host ""

# Validate required environment variables
Write-Host "Validating environment variables..." -ForegroundColor Yellow
$requiredVars = @('MONGODB_URI', 'JWT_SECRET', 'EMAIL_USER', 'EMAIL_PASS', 'RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET')
$missingVars = @()

foreach ($var in $requiredVars) {
    if (-not (Get-Item "Env:$var" -ErrorAction SilentlyContinue)) {
        $missingVars += $var
    }
}

if ($missingVars.Count -gt 0) {
    Write-Host "ERROR: Missing required environment variables:" -ForegroundColor Red
    foreach ($var in $missingVars) {
        Write-Host "  - $var" -ForegroundColor Red
    }
    Write-Host "Please set these variables before deployment" -ForegroundColor Yellow
    exit 1
}
Write-Host "All required environment variables are set" -ForegroundColor Green

Write-Host ""
Write-Host "Deployment Target: $Target" -ForegroundColor Yellow

# Deploy Backend
if ($Target -eq "backend" -or $Target -eq "all") {
    Write-Host ""
    Write-Host "=== Backend Deployment ===" -ForegroundColor Blue
    
    $backendDeployScript = Join-Path -Path (Get-Location) -ChildPath "deploy-backend.ps1"
    if (Test-Path $backendDeployScript) {
        Write-Host "Running backend deployment script..." -ForegroundColor Cyan
        & $backendDeployScript
    } else {
        Write-Host "Backend deployment script not found at $backendDeployScript" -ForegroundColor Red
        exit 1
    }
}

# Deploy Infrastructure (CDK)
if ($Target -eq "infrastructure" -or $Target -eq "all") {
    Write-Host ""
    Write-Host "=== Infrastructure Deployment (CDK) ===" -ForegroundColor Blue
    
    Write-Host "Checking Node.js dependencies..." -ForegroundColor Cyan
    $npmCheck = Invoke-CommandWithRetry -Description "npm install" -Command { npm install }
    
    if ($npmCheck) {
        Write-Host "Building CDK..." -ForegroundColor Cyan
        $buildCheck = Invoke-CommandWithRetry -Description "npm run build" -Command { npm run build }
        
        if ($buildCheck) {
            Write-Host "Deploying CDK stack..." -ForegroundColor Cyan
            Invoke-CommandWithRetry -Description "cdk deploy" -Command { npx cdk deploy --all --require-approval never }
        }
    }
}

Write-Host ""
Write-Host "✅ Deployment completed!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
