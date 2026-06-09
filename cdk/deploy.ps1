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
            & $Command
            if ($LASTEXITCODE -eq 0 -or $LASTEXITCODE -eq $null) {
                Write-Host "✅ SUCCESS: $Description" -ForegroundColor Green
                return $true
            } else {
                Write-Host "❌ FAILED: Exit code $LASTEXITCODE" -ForegroundColor Red
                if ($attempt -lt $MaxRetries) {
                    Write-Host "Retrying in $RetryDelay seconds..." -ForegroundColor Yellow
                    Start-Sleep -Seconds $RetryDelay
                }
            }
        }
        catch {
            Write-Host "❌ FAILED: $_" -ForegroundColor Red
            if ($attempt -lt $MaxRetries) {
                Write-Host "Retrying in $RetryDelay seconds..." -ForegroundColor Yellow
                Start-Sleep -Seconds $RetryDelay
            }
        }
        $attempt++
    }
    
    Write-Host "❌ Command failed after $MaxRetries attempts: $Description" -ForegroundColor Red
    return $false
}

Write-Host ""
Write-Host "🚀 JalSaathi CDK Deployment Started" -ForegroundColor Magenta
Write-Host "====================================" -ForegroundColor Magenta
Write-Host ""

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
    Write-Host "✅ Loaded $loadedCount environment variables from .env" -ForegroundColor Green
}
else {
    Write-Host "❌ .env file not found in current directory" -ForegroundColor Red
    exit 1
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
    Write-Host "❌ ERROR: Missing required environment variables:" -ForegroundColor Red
    foreach ($var in $missingVars) {
        Write-Host "  - $var" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "Please set these variables in .env file before deployment" -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ All required environment variables are set" -ForegroundColor Green

Write-Host ""
Write-Host "Deployment Target: $Target" -ForegroundColor Yellow
Write-Host ""

# Deploy Infrastructure (CDK)
if ($Target -eq "infrastructure" -or $Target -eq "all") {
    Write-Host "=== Infrastructure Deployment (CDK) ===" -ForegroundColor Blue
    Write-Host ""
    
    Write-Host "Checking Node.js installation..." -ForegroundColor Cyan
    $nodeVersion = node --version 2>$null
    if ($null -eq $nodeVersion) {
        Write-Host "❌ Node.js not found. Please install Node.js 18+" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Node.js $nodeVersion installed" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "Building frontend..." -ForegroundColor Cyan
    Push-Location ../frontend
    Write-Host "Installing frontend dependencies..." -ForegroundColor Gray
    $frontendInstallSuccess = Invoke-CommandWithRetry -Description "npm ci --include dev" -Command { npm ci --include dev }
    
    if ($frontendInstallSuccess) {
        Write-Host "Building frontend with Vite..." -ForegroundColor Gray
        $buildSuccess = Invoke-CommandWithRetry -Description "npm run build" -Command { npm run build }
        if (-not $buildSuccess) {
            Write-Host "❌ Frontend build failed" -ForegroundColor Red
            Pop-Location
            exit 1
        }
        Write-Host "✅ Frontend built successfully to dist/" -ForegroundColor Green
    } else {
        Write-Host "❌ Frontend npm install failed" -ForegroundColor Red
        Pop-Location
        exit 1
    }
    Pop-Location
    
    Write-Host ""
    Write-Host "Installing CDK dependencies..." -ForegroundColor Cyan
    $cdkInstallSuccess = Invoke-CommandWithRetry -Description "npm ci --include dev" -Command { npm ci --include dev }
    
    if (-not $cdkInstallSuccess) {
        Write-Host "❌ CDK npm install failed" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ CDK dependencies installed" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "Bootstrapping AWS CDK environment..." -ForegroundColor Cyan
    Invoke-CommandWithRetry -Description "npx cdk bootstrap" -Command { npx cdk bootstrap } | Out-Null
    
    Write-Host ""
    Write-Host "Deploying CDK stacks (no approval needed)..." -ForegroundColor Cyan
    $deploySuccess = Invoke-CommandWithRetry -Description "npx cdk deploy --all --require-approval never" -Command { npx cdk deploy --all --require-approval never }
    
    if ($deploySuccess) {
        Write-Host ""
        Write-Host "✅ CDK Deployment completed successfully!" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "❌ CDK Deployment failed" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "✅ Deployment Pipeline Completed!" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. Verify backend: curl https://w3ko27ats7.execute-api.ap-south-1.amazonaws.com/prod/health" -ForegroundColor Gray
Write-Host "2. Check frontend: https://jalsaathived.vercel.app" -ForegroundColor Gray
Write-Host "3. Monitor: AWS Console > Lambda > CloudWatch" -ForegroundColor Gray
Write-Host ""
