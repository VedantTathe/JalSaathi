# CDK for JalSaathi

This folder contains a small AWS CDK TypeScript app for the JalSaathi project.

Quick start:

```bash
cd cdk
npm install
npx cdk bootstrap            # once per account/region
npx cdk deploy --all         # deploy stacks
```

Or use the helper script:

```bash
cd cdk
./deploy.sh
```

Use `-c stage=beta` to deploy the beta stack: `npx cdk deploy -c stage=beta`.
