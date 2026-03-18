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
Write-Host "================================`n" -ForegroundColor Magenta

# Build frontend
Write-Host "Building frontend..." -ForegroundColor Blue
Push-Location ../frontend
npm install
npm run build
Pop-Location

# Install CDK dependencies
Write-Host "`nInstalling CDK dependencies..." -ForegroundColor Blue
npm install

# Bootstrap
Write-Host "`nBootstrapping AWS environment..." -ForegroundColor Blue
$bootstrapScript = { npx cdk bootstrap }
if (-not (Invoke-CommandWithRetry -Description "CDK Bootstrap" -Command $bootstrapScript -MaxRetries $MaxRetries -RetryDelay $RetryDelay)) {
    Write-Host "FAILED: Deployment failed during bootstrapping" -ForegroundColor Red
    exit 1
}

# Deploy
Write-Host "`nDeploying application..." -ForegroundColor Blue
$deployScript = { npx cdk deploy --all --require-approval never }
if (-not (Invoke-CommandWithRetry -Description "CDK Deploy" -Command $deployScript -MaxRetries $MaxRetries -RetryDelay $RetryDelay)) {
    Write-Host "FAILED: Deployment failed during stack deployment" -ForegroundColor Red
    exit 1
}

Write-Host "`nSUCCESS: Deployment completed successfully!" -ForegroundColor Green
Write-Host "Your application is live!" -ForegroundColor Cyan
