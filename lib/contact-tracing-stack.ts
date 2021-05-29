import {
  Stack,
  StackProps,
  aws_dynamodb as dynamo,
  aws_appsync as appsync,
  aws_cognito as cognito,
  aws_iam as iam,
  CfnOutput,
} from "aws-cdk-lib";
import { Construct } from "constructs";
import { readFileSync } from "fs"
import { join } from "path"

export class ContactTracingStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const contact_table = new dynamo.Table(this, "contact-tracing-table", {
      tableName: "contacts",
      encryption: dynamo.TableEncryption.AWS_MANAGED,
      partitionKey: {
        name: "location_id",
        type: dynamo.AttributeType.STRING,
      },
      sortKey: {
        name: "checkin_datetime",
        type: dynamo.AttributeType.STRING,
      },
    });

    contact_table.addGlobalSecondaryIndex({
      indexName: "index_by_user",
      partitionKey: {
        name: "user_id",
        type: dynamo.AttributeType.STRING,
      },
      sortKey: {
        name: "checkin_datetime",
        type: dynamo.AttributeType.STRING,
      },
    });

    const user_pool = new cognito.UserPool(this, 'ct-user-pool', {
      userPoolName: "contact-tracing-pool",
      signInCaseSensitive: false,
    })

    const user_pool_client = new cognito.UserPoolClient(this, 'ct-user-pool-client', {
      userPool: user_pool,
      userPoolClientName: 'contact-tracing-client',
    })

    // const appsync_log_role = new iam.Role(this, 'AppSyncLogRole', {
    //   assumedBy: new iam.ServicePrincipal('appsync.amazonaws.com'),
    //   inlinePolicies
    // });

    const api = new appsync.CfnGraphQLApi(this, 'ct-api', {
      authenticationType: "AMAZON_COGNITO_USER_POOLS",
      name: "contact-tracing-api",
      userPoolConfig: {
        userPoolId: user_pool.userPoolId,
        awsRegion: this.region,
        defaultAction: "ALLOW"
      },
      logConfig: {
        cloudWatchLogsRoleArn: "arn:aws:iam::457234467265:role/service-role/appsync-graphqlapi-logs-ap-southeast-2",
        excludeVerboseContent: false,
        fieldLogLevel: "ALL"
      }
    })

    const api_schema = new appsync.CfnGraphQLSchema(this, 'ct-api-schema', {
      apiId: api.attrApiId,
      definition: readFileSync(join(__dirname, "schema.graphql")).toString()
    })

    const table_role = new iam.Role(this, 'ItemsDynamoDBRole', {
      assumedBy: new iam.ServicePrincipal('appsync.amazonaws.com'),
    });
    table_role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonDynamoDBFullAccess'));

    const dataSource = new appsync.CfnDataSource(this, 'ItemsDataSource', {
      apiId: api.attrApiId,
      name: 'ItemsDynamoDataSource',
      type: 'AMAZON_DYNAMODB',
      dynamoDbConfig: {
        tableName: contact_table.tableName,
        awsRegion: this.region
      },
      serviceRoleArn: table_role.roleArn
    });

    const checkinResolver = new appsync.CfnResolver(this, 'checkinMutationResolver', {
      apiId: api.attrApiId,
      typeName: 'Mutation',
      fieldName: 'checkin',
      dataSourceName: dataSource.name,
      requestMappingTemplate: `{
        "version": "2018-05-29",
        "operation": "PutItem",
        "key": {
          "location_id": $util.dynamodb.toDynamoDBJson($ctx.args.location_id),
          "checkin_datetime": $util.dynamodb.toDynamoDBJson($util.time.nowISO8601())
        },
        "attributeValues": {
          "user_id": $util.dynamodb.toDynamoDBJson($ctx.args.user_id)
        }
      }`,
      responseMappingTemplate: `$util.toJson($ctx.result)`
    });
    checkinResolver.addDependsOn(api_schema);

    new CfnOutput(this, "api-url", {
      value: api.attrGraphQlUrl
    })
  }
}
