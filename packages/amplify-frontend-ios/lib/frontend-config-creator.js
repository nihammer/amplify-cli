const constants = require('./constants');
const path = require('path');
const fs = require('fs');


function createAmplifyConfig(context, amplifyResources) {
  const { amplify } = context;
  const projectConfig = amplify.getProjectConfig();
  const srcDirPath = path.join(projectConfig.projectPath);

  if (fs.existsSync(srcDirPath)) {
    const targetFilePath = path.join(srcDirPath, constants.amplifyConfigFilename);
    const jsonString = JSON.stringify(amplifyResources, null, 4);
    fs.writeFileSync(targetFilePath, jsonString, 'utf8');
  }
}

function createAWSConfig(context, amplifyResources) {
  const { serviceResourceMapping } = amplifyResources;
  const configOutput = {
    UserAgent: 'aws-amplify/cli',
    Version: '0.1.0',
    IdentityManager: {
      Default: {},
    },
  };

  const projectRegion = amplifyResources.metadata.Region;

  Object.keys(serviceResourceMapping).forEach((service) => {
    switch (service) {
      case 'Cognito': Object.assign(configOutput, getCognitoConfig(serviceResourceMapping[service], projectRegion));
        break;
      case 'S3': Object.assign(configOutput, getS3Config(serviceResourceMapping[service], projectRegion));
        break;
      case 'Pinpoint': Object.assign(configOutput, getPinpointConfig(serviceResourceMapping[service], projectRegion));
        break;
      case 'DynamoDB': Object.assign(configOutput, getDynamoDBConfig(serviceResourceMapping[service], projectRegion));
        break;
      case 'AppSync': Object.assign(configOutput, getAppSyncConfig(serviceResourceMapping[service], projectRegion));
        break;
      default: break;
    }
  });
  generateAWSConfigFile(context, configOutput);
}

function generateAWSConfigFile(context, configOutput) {
  const { amplify } = context;
  const projectConfig = amplify.getProjectConfig();
  const srcDirPath = path.join(projectConfig.projectPath);

  if (fs.existsSync(srcDirPath)) {
    const targetFilePath = path.join(srcDirPath, constants.awsConfigFilename);
    const jsonString = JSON.stringify(configOutput, null, 4);
    fs.writeFileSync(targetFilePath, jsonString, 'utf8');
  }
}

function getCognitoConfig(cognitoResources, projectRegion) {
  // There can only be one cognito instance

  const cognitoResource = cognitoResources[0];

  const resourceValue = {
    CredentialsProvider: {
      CognitoIdentity: {
        Default: {
          PoolId: cognitoResource.output.IdentityPoolId,
          Region: projectRegion,
        },
      },
    },
    CognitoUserPool: {
      Default: {
        PoolId: cognitoResource.output.UserPoolId,
        AppClientId: cognitoResource.output.AppClientID,
        AppClientSecret: cognitoResource.output.AppClientSecret,
        Region: projectRegion,
      },
    },
  };

  if (cognitoResource.output.GoogleWebClient || cognitoResource.output.GoogleIOSClient) {
    resourceValue.GoogleSignIn = {
      Permissions: 'email,profile,openid',
    };
    if (cognitoResource.output.GoogleWebClient) {
      resourceValue.GoogleSignIn['ClientId-WebApp'] = cognitoResource.output.GoogleWebClient;
    }
    if (cognitoResource.output.GoogleIOSClient) {
      resourceValue.GoogleSignIn['ClientId-iOS'] = cognitoResource.output.GoogleIOSClient;
    }
  }
  if (cognitoResource.output.FacebookWebClient) {
    resourceValue.FacebookSignIn = {
      AppId: cognitoResource.output.FacebookWebClient,
      Permissions: 'public_profile',
    };
  }


  return resourceValue;
}

function getS3Config(s3Resources) {
  const s3Resource = s3Resources[0];

  return {
    S3TransferUtility: {
      Default: {
        Bucket: s3Resource.output.BucketName,
        Region: s3Resource.output.Region,
      },
    },
  };
}

function getPinpointConfig(pinpointResources) {
  const pinpointResource = pinpointResources[0];
  return {
    PinpointAnalytics: {
      Default: {
        AppId: pinpointResource.output.Id,
        Region: 'us-east-1',
      },
    },
    PinpointTargeting: {
      Default: {
        Region: 'us-east-1',
      },
    },
  };
}

function getDynamoDBConfig(dynamoDBResources, projectRegion) {
  return {
    DynamoDBObjectMapper: {
      Default: {
        Region: projectRegion,
      },
    },
  };
}

function getAppSyncConfig(appsyncResources, projectRegion) {
  // There can only be one appsync resource
  const appsyncResource = appsyncResources[0];
  return {
    AppSync: {
      Default: {
        ApiUrl: appsyncResource.output.GraphQLAPIEndpointOutput,
        Region: projectRegion,
        AuthMode: appsyncResource.output.securityType,
        ApiKey: appsyncResource.output.securityType === 'API_KEY' ? appsyncResource.output.GraphQLAPIKeyOutput : undefined,
      },
    },
  };
}

module.exports = { createAWSConfig, createAmplifyConfig };
