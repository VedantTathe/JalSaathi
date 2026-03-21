param(
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
$requiredVars = @('MONGODB_URI', 'JWT_SECRET', 'EMAIL_USER', 'EMAIL_PASS', 'CASHFREE_APP_ID', 'CASHFREE_SECRET_KEY')
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

# Build frontend
Write-Host ""
Write-Host "Building frontend..." -ForegroundColor Blue
Push-Location ../frontend
Write-Host "Installing frontend dependencies..." -ForegroundColor Gray
npm ci --include dev
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Frontend npm ci failed" -ForegroundColor Red
    Pop-Location
    exit 1
}
Write-Host "Running build..." -ForegroundColor Gray
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Frontend build failed" -ForegroundColor Red
    Pop-Location
    exit 1
}
Write-Host "Frontend built successfully" -ForegroundColor Green
Pop-Location

# Install CDK dependencies
Write-Host ""
Write-Host "Installing CDK dependencies..." -ForegroundColor Blue
if (Test-Path "node_modules") {
    Write-Host "Updating existing node_modules..." -ForegroundColor Gray
} else {
    Write-Host "Installing fresh dependencies..." -ForegroundColor Gray
}
npm ci
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: CDK npm ci failed" -ForegroundColor Red
    exit 1
}
Write-Host "CDK dependencies installed" -ForegroundColor Green

# Bootstrap
Write-Host ""
Write-Host "Bootstrapping AWS environment..." -ForegroundColor Blue
$bootstrapScript = { npx cdk bootstrap }
if (-not (Invoke-CommandWithRetry -Description "CDK Bootstrap" -Command $bootstrapScript -MaxRetries $MaxRetries -RetryDelay $RetryDelay)) {
    Write-Host "FAILED: Deployment failed during bootstrapping" -ForegroundColor Red
    exit 1
}

# Deploy
Write-Host ""
Write-Host "Deploying application..." -ForegroundColor Blue
$deployScript = { npx cdk deploy --all --require-approval never }
if (-not (Invoke-CommandWithRetry -Description "CDK Deploy" -Command $deployScript -MaxRetries $MaxRetries -RetryDelay $RetryDelay)) {
    Write-Host "FAILED: Deployment failed during stack deployment" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "SUCCESS: Deployment completed successfully" -ForegroundColor Green
Write-Host "Your application is now live" -ForegroundColor Cyan
