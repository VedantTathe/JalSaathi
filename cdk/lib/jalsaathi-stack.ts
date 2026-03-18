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
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL
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
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS
      },
      defaultRootObject: 'index.html',
      // For SPA: serve index.html for all 404s so React Router can handle routing
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html'
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
        MONGODB_URI: process.env.MONGODB_URI || 'mongodb+srv://vedant:vedant@cluster0.3glbf3u.mongodb.net/JalSaathiDB?retryWrites=true&w=majority',
        JWT_SECRET: process.env.JWT_SECRET || 'jalsaathi-super-secret-jwt-key-2026-production-ready',
        JWT_EXPIRES_IN: '7d',
        FRONTEND_URL: 'https://d2jz2lz6xmw1no.cloudfront.net',
        ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'vedanttathe30@gmail.com',
        EMAIL_HOST: process.env.EMAIL_HOST || 'smtp.gmail.com',
        EMAIL_PORT: process.env.EMAIL_PORT || '587',
        EMAIL_SECURE: 'false',
        EMAIL_USER: process.env.EMAIL_USER || 'withnocheatssfs@gmail.com',
        EMAIL_PASS: process.env.EMAIL_PASS || 'suykoxwymvrpzskq',
        EMAIL_FROM: process.env.EMAIL_FROM || 'JalSaathi <withnocheatssfs@gmail.com>',
        PLATFORM_COMMISSION_PERCENT: '1.5',
        IS_WEBSITE_ON: 'true',
        CASHFREE_APP_ID: process.env.CASHFREE_APP_ID || '1211037940d724ad17953a9787c7301121',
        CASHFREE_SECRET_KEY: process.env.CASHFREE_SECRET_KEY || 'cfsk_ma_prod_d1a18c3f4c2cc3f41deb0caca84e7012_4e5d2d0d',
        CASHFREE_ENV: 'production',
        BACKEND_URL: 'https://w3ko27ats7.execute-api.ap-south-1.amazonaws.com/prod',
        CASHFREE_RETURN_URL: 'https://d2jz2lz6xmw1no.cloudfront.net/dashboard/',
        CASHFREE_WEBHOOK_URL: 'https://w3ko27ats7.execute-api.ap-south-1.amazonaws.com/prod/api/webhook/cashfree'
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
    new s3deploy.BucketDeployment(this, 'DeployWebsite', {
      sources: [s3deploy.Source.asset(frontendDist)],
      destinationBucket: siteBucket,
      distribution,
      distributionPaths: ['/*']
    });

    // Outputs
    new cdk.CfnOutput(this, 'CloudFrontURL', { value: `https://${distribution.distributionDomainName}` });
    new cdk.CfnOutput(this, 'ApiUrl', { value: api.url });

    // Helpful tag policy note (allow CloudFront to read S3)
    new cdk.CfnOutput(this, 'BucketName', { value: siteBucket.bucketName });
  }
}
