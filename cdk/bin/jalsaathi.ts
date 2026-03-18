#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { JalsaathiStack } from '../lib/jalsaathi-stack';

const app = new cdk.App();

// Get the target stage from context or environment
// Usage: cdk deploy -c stage=beta OR cdk deploy JalSaathiBetaStack
const targetStage = app.node.tryGetContext('stage') as string | undefined;

if (!targetStage || targetStage === 'prod' || targetStage === 'all') {
  new JalsaathiStack(app, 'JalSaathiStack', {
    stage: 'prod',
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: 'ap-south-1'
    },
    description: 'JalSaathi - Production'
  } as any);
}

if (targetStage === 'beta' || targetStage === 'all') {
  new JalsaathiStack(app, 'JalSaathiBetaStack', {
    stage: 'beta',
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: 'ap-south-1'
    },
    description: 'JalSaathi - Beta (Testing)'
  } as any);
}

app.synth();
