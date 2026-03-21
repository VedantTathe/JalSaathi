import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { aws_s3 as s3, aws_s3_deployment as s3deploy, aws_cloudfront as cloudfront, aws_cloudfront_origins as origins, aws_lambda as lambda, aws_apigateway as apigateway, aws_iam as iam } from 'aws-cdk-lib';
import * as path from 'path';

export interface JalsaathiStackProps extends cdk.StackProps {
  stage?: string;
  description?: string;
}

export class JalsaathiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: JalsaathiStackProps = {}) {
    super(scope, id, props);

    // S3 bucket for static frontend
    const siteBucket = new s3.Bucket(this, 'JalSaathiBucket', {
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      autoDeleteObjects: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: true,  // Enable versioning for safe updates
      enforceSSL: true
    });

    // CloudFront Origin Access Identity so bucket is private
    const oai = new cloudfront.OriginAccessIdentity(this, 'JalSaathiOAI', {
      comment: 'OAI for JalSaathi static site'
    });

    siteBucket.grantRead(oai.grantPrincipal);

    // CloudFront distribution for the static site
    const distribution = new cloudfront.Distribution(this, 'JalSaathiDistribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(siteBucket, { originAccessIdentity: oai }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,  // index.html: no cache
        compress: true
      },
      additionalBehaviors: {
        // Cache assets (js, css) with fingerprinting: long cache
        '/*.js': {
          origin: new origins.S3Origin(siteBucket, { originAccessIdentity: oai }),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
          compress: true
        },
        '/*.css': {
          origin: new origins.S3Origin(siteBucket, { originAccessIdentity: oai }),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
          compress: true
        }
      },
      defaultRootObject: 'index.html',
      // For SPA: serve index.html for all 404s so React Router can handle routing
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.seconds(0)  // Never cache 404 responses
        }
      ]
    });

    // Backend Lambda (packages backend/ with dependencies)
    const backendCodePath = path.join(__dirname, '..', '..', 'backend');
    const backendFunction = new lambda.Function(this, 'JalSaathiBackendFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'server.handler',
      memorySize: 512,
      timeout: cdk.Duration.seconds(30),
      code: lambda.Code.fromAsset(backendCodePath),
      environment: {
        NODE_ENV: 'production',
        PORT: '5000',
        MONGODB_URI: process.env.MONGODB_URI || '',
        JWT_SECRET: process.env.JWT_SECRET || '',
        JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
        FRONTEND_URL: process.env.FRONTEND_URL || 'https://d2jz2lz6xmw1no.cloudfront.net',
        ADMIN_EMAIL: process.env.ADMIN_EMAIL || '',
        EMAIL_HOST: process.env.EMAIL_HOST || '',
        EMAIL_PORT: process.env.EMAIL_PORT || '587',
        EMAIL_SECURE: process.env.EMAIL_SECURE || 'false',
        EMAIL_USER: process.env.EMAIL_USER || '',
        EMAIL_PASS: process.env.EMAIL_PASS || '',
        EMAIL_FROM: process.env.EMAIL_FROM || '',
        PLATFORM_COMMISSION_PERCENT: process.env.PLATFORM_COMMISSION_PERCENT || '1.5',
        IS_WEBSITE_ON: process.env.IS_WEBSITE_ON || 'true',
        CASHFREE_APP_ID: process.env.CASHFREE_APP_ID || '',
        CASHFREE_SECRET_KEY: process.env.CASHFREE_SECRET_KEY || '',
        CASHFREE_ENV: process.env.CASHFREE_ENV || 'production',
        BACKEND_URL: process.env.BACKEND_URL || 'https://w3ko27ats7.execute-api.ap-south-1.amazonaws.com/prod',
        CASHFREE_RETURN_URL: process.env.CASHFREE_RETURN_URL || 'https://d2jz2lz6xmw1no.cloudfront.net/dashboard/',
        CASHFREE_WEBHOOK_URL: process.env.CASHFREE_WEBHOOK_URL || 'https://w3ko27ats7.execute-api.ap-south-1.amazonaws.com/prod/api/webhook/cashfree'
      }
    });

    // API Gateway to expose the Lambda with CORS enabled
    const api = new apigateway.LambdaRestApi(this, 'JalSaathiApi', {
      handler: backendFunction,
      proxy: true,
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization']
      }
    });

    // Deploy frontend build (expects frontend/dist to exist when deploying)
    const frontendDist = path.join(__dirname, '..', '..', 'frontend', 'dist');
    const fs = require('fs');
    
    if (!fs.existsSync(frontendDist)) {
      throw new Error(
        `Frontend build not found at ${frontendDist}. ` +
        `Run 'npm run build' in the frontend directory before deploying.`
      );
    }
    
    // Deploy to S3 with aggressive invalidation
    // memoryLimit: Increase to detect all file changes
    new s3deploy.BucketDeployment(this, 'DeployWebsite', {
      sources: [s3deploy.Source.asset(frontendDist)],
      destinationBucket: siteBucket,
      distribution,
      distributionPaths: ['/*'],  // Invalidate entire CloudFront distribution
      prune: true  // Remove files from S3 that don't exist in dist/
    });

    // Outputs
    new cdk.CfnOutput(this, 'CloudFrontURL', { value: `https://${distribution.distributionDomainName}` });
    new cdk.CfnOutput(this, 'ApiUrl', { value: api.url });

    // Helpful tag policy note (allow CloudFront to read S3)
    new cdk.CfnOutput(this, 'BucketName', { value: siteBucket.bucketName });
  }
}
