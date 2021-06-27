import {
    aws_appsync as appsync,
    aws_cognito as cognito,
    aws_dax as dax,
    aws_dynamodb as dynamo,
    aws_ec2 as ec2,
    aws_iam as iam,
    CfnOutput,
    Duration,
    Stack,
    StackProps,
} from "aws-cdk-lib";
import {Vpc} from "aws-cdk-lib/lib/aws-ec2";
import {GolangFunction} from "aws-lambda-golang-cdk-v2";
import {Construct} from "constructs";
import {readFileSync} from "fs";
import {join} from "path";
import {BillingMode} from "aws-cdk-lib/aws-dynamodb";

export class ContactTracingStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        const contact_table = new dynamo.Table(this, "contact-tracing-table", {
            tableName: "checkins",
            encryption: dynamo.TableEncryption.AWS_MANAGED,
            partitionKey: {
                name: "location_id",
                type: dynamo.AttributeType.STRING,
            },
            sortKey: {
                name: "checkin_datetime",
                type: dynamo.AttributeType.STRING,
            },
            billingMode: BillingMode.PAY_PER_REQUEST
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

        const locations_table = new dynamo.Table(this, "location-data-table", {
            tableName: "locations",
            encryption: dynamo.TableEncryption.AWS_MANAGED,
            partitionKey: {
                name: "location_id",
                type: dynamo.AttributeType.STRING,
            },
        });

        const daxRole = new iam.Role(this, "dax-role", {
            assumedBy: new iam.ServicePrincipal("dax.amazonaws.com"),
            inlinePolicies: {
                dynamo_access: new iam.PolicyDocument({
                    statements: [
                        new iam.PolicyStatement({
                            actions: ["dynamodb:*"],
                            effect: iam.Effect.ALLOW,
                            resources: [
                                contact_table.tableArn,
                                `${contact_table.tableArn}/index/index_by_user`,
                            ],
                        }),
                    ],
                }),
            },
        });

        const vpc = new ec2.Vpc(this, "contacts-vpc", {
            cidr: Vpc.DEFAULT_CIDR_RANGE,
            subnetConfiguration: [
                {
                    cidrMask: 24,
                    name: "default",
                    subnetType: ec2.SubnetType.PUBLIC,
                },
                {
                    cidrMask: 24,
                    name: "contact-tracing",
                    subnetType: ec2.SubnetType.PRIVATE,
                },
            ],
        });

        const securityGroup = new ec2.SecurityGroup(this, "security-group-vpc", {
            vpc: vpc,
        });

        const daxSubnetGroup = new dax.CfnSubnetGroup(this, "dax-subnet-group", {
            subnetGroupName: "contact-tracing",
            subnetIds: vpc.privateSubnets.map(subnet => subnet.subnetId)
        })

        // securityGroup.addEgressRule()

        const cache = new dax.CfnCluster(this, "dax-contacts", {
            clusterName: "contacts",
            description: "DAX cache for contact tracing",
            iamRoleArn: daxRole.roleArn,
            nodeType: "dax.t3.small",
            replicationFactor: 1,
            securityGroupIds: [securityGroup.securityGroupId],
            sseSpecification: {
                sseEnabled: true,
            },
            subnetGroupName: daxSubnetGroup.subnetGroupName
        });

        cache.addDependsOn(daxSubnetGroup)

        const user_pool = new cognito.UserPool(this, "ct-user-pool", {
            userPoolName: "contact-tracing-pool",
            signInCaseSensitive: false,
        });

        const user_pool_client = new cognito.UserPoolClient(
            this,
            "ct-user-pool-client",
            {
                userPool: user_pool,
                userPoolClientName: "contact-tracing-client",
            }
        );

        // const appsync_log_role = new iam.Role(this, 'AppSyncLogRole', {
        //   assumedBy: new iam.ServicePrincipal('appsync.amazonaws.com'),
        //   inlinePolicies
        // });

        const api = new appsync.CfnGraphQLApi(this, "ct-api", {
            authenticationType: "AMAZON_COGNITO_USER_POOLS",
            name: "contact-tracing-api",
            userPoolConfig: {
                userPoolId: user_pool.userPoolId,
                awsRegion: this.region,
                defaultAction: "ALLOW",
            },
            logConfig: {
                cloudWatchLogsRoleArn:
                    "arn:aws:iam::457234467265:role/service-role/appsync-graphqlapi-logs-ap-southeast-2",
                excludeVerboseContent: false,
                fieldLogLevel: "ALL",
            },
        });

        const api_schema = new appsync.CfnGraphQLSchema(this, "ct-api-schema", {
            apiId: api.attrApiId,
            definition: readFileSync(
                join(__dirname, "graphql/schema.graphql")
            ).toString(),
        });

        const table_role = new iam.Role(this, "ItemsDynamoDBRole", {
            assumedBy: new iam.ServicePrincipal("appsync.amazonaws.com"),
        });
        table_role.addManagedPolicy(
            iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonDynamoDBFullAccess")
        );

        const dataSource = new appsync.CfnDataSource(this, "ItemsDataSource", {
            apiId: api.attrApiId,
            name: "ItemsDynamoDataSource",
            type: "AMAZON_DYNAMODB",
            dynamoDbConfig: {
                tableName: contact_table.tableName,
                awsRegion: this.region,
            },
            serviceRoleArn: table_role.roleArn,
        });

        const checkinResolver = new appsync.CfnResolver(
            this,
            "checkinMutationResolver",
            {
                apiId: api.attrApiId,
                typeName: "Mutation",
                fieldName: "check_in",
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
                responseMappingTemplate: `$util.toJson($ctx.result)`,
            }
        );
        checkinResolver.addDependsOn(api_schema);

        const getUserLocationHistoryResolver = new appsync.CfnResolver(
            this,
            "getUserLocationHistoryQueryResolver",
            {
                apiId: api.attrApiId,
                typeName: "Query",
                fieldName: "get_user_location_history",
                dataSourceName: dataSource.name,
                requestMappingTemplate: `{
        "version": "2018-05-29",
        "operation":  "Query",
        "query": {
          "expression": "user_id = :userId \
          #if( $ctx.args.from && $ctx.args.until )
            AND checkin_datetime BETWEEN :from AND :until",
          #elseif( $ctx.args.from )
            AND checkin_datetime >= :from",
          #elseif( $ctx.args.until )
            AND checkin_datetime <= :until",
          #else
            ",
          #end
          "expressionValues": {
            ":userId": $util.dynamodb.toDynamoDBJson($ctx.args.user_id),
          #if( $ctx.args.from ) 
            ":from": $util.dynamodb.toDynamoDBJson($ctx.args.from),
          #end
          #if( $ctx.args.until ) 
            ":until": $util.dynamodb.toDynamoDBJson($ctx.args.until),
          #end
          }
        },
        "index": "index_by_user",
        "limit": $util.defaultIfNull($ctx.args.limit, 20),
        "nextToken": $util.toJson($util.defaultIfNullOrBlank($ctx.args.nextToken, null))
      }`,
                responseMappingTemplate: `{
        "items": $util.toJson($ctx.result.items),
        "nextToken": $util.toJson($util.defaultIfNullOrBlank($ctx.result.nextToken, null))
      }`,
            }
        );
        getUserLocationHistoryResolver.addDependsOn(api_schema);

        const getLocationAttendeesResolver = new appsync.CfnResolver(
            this,
            "getLocationAttendeesQueryResolver",
            {
                apiId: api.attrApiId,
                typeName: "Query",
                fieldName: "get_location_attendees",
                dataSourceName: dataSource.name,
                requestMappingTemplate: `{
        "version": "2018-05-29",
        "operation":  "Query",
        "query": {
          "expression": "location_id = :locationId \
          #if( $ctx.args.from && $ctx.args.until )
            AND checkin_datetime BETWEEN :from AND :until",
          #elseif( $ctx.args.from )
            AND checkin_datetime >= :from",
          #elseif( $ctx.args.until )
            AND checkin_datetime <= :until",
          #else
            ",
          #end
          "expressionValues": {
            ":locationId": $util.dynamodb.toDynamoDBJson($ctx.args.location_id),
          #if( $ctx.args.from ) 
            ":from": $util.dynamodb.toDynamoDBJson($ctx.args.from),
          #end
          #if( $ctx.args.until ) 
            ":until": $util.dynamodb.toDynamoDBJson($ctx.args.until),
          #end
          }
        },
        "limit": $util.defaultIfNull($ctx.args.limit, 20),
        "nextToken": $util.toJson($util.defaultIfNullOrBlank($ctx.args.nextToken, null))
      }`,
                responseMappingTemplate: `{
        "items": $util.toJson($ctx.result.items),
        "nextToken": $util.toJson($util.defaultIfNullOrBlank($ctx.result.nextToken, null))
      }`,
            }
        );
        getLocationAttendeesResolver.addDependsOn(api_schema);

        const func = new GolangFunction(this, "contact-tracing-func", {
            entry: "lib/functions/contact_trace/main.go",
            environment: {
                TABLE_NAME: contact_table.tableName,
            },
            timeout: Duration.seconds(30),
            memorySize: 1024,
            initialPolicy: [
                new iam.PolicyStatement({
                    actions: ["dynamodb:Query"],
                    effect: iam.Effect.ALLOW,
                    resources: [
                        contact_table.tableArn,
                        `${contact_table.tableArn}/index/index_by_user`,
                    ],
                }),
            ],
        });
        const contactTracingTreeFunc = new GolangFunction(
            this,
            "contact-tracing-tree-func",
            {
                entry: "lib/functions/contact_trace_tree/main.go",
                environment: {
                    TABLE_NAME: contact_table.tableName,
                },
                timeout: Duration.seconds(30),
                memorySize: 1024,
                initialPolicy: [
                    new iam.PolicyStatement({
                        actions: ["dynamodb:Query"],
                        effect: iam.Effect.ALLOW,
                        resources: [
                            contact_table.tableArn,
                            `${contact_table.tableArn}/index/index_by_user`,
                        ],
                    }),
                ],
            }
        );

        const contactTracingFlatFunc = new GolangFunction(
            this,
            "contact-tracing-flat-func",
            {
                entry: "lib/functions/contact_trace_flat/main.go",
                vpc: vpc,
                vpcSubnets: {
                    subnetType: ec2.SubnetType.PRIVATE
                },
                securityGroups: [securityGroup],
                environment: {
                    TABLE_NAME: contact_table.tableName,
                    DAX_ENDPOINT: cache.attrClusterDiscoveryEndpoint,
                },
                timeout: Duration.minutes(15),
                memorySize: 1024,
                initialPolicy: [
                    new iam.PolicyStatement({
                        actions: ["dynamodb:Query"],
                        effect: iam.Effect.ALLOW,
                        resources: [
                            contact_table.tableArn,
                            `${contact_table.tableArn}/index/index_by_user`,
                        ],
                    }),
                    new iam.PolicyStatement({
                        actions: ["dax:*"],
                        effect: iam.Effect.ALLOW,
                        resources: [
                            "*",
                        ],
                    }),
                ],
            }
        );
        const lambda_role = new iam.Role(this, "LambdaRole", {
            assumedBy: new iam.ServicePrincipal("appsync.amazonaws.com"),
            inlinePolicies: {
                lambda_access: new iam.PolicyDocument({
                    statements: [
                        new iam.PolicyStatement({
                            actions: ["lambda:InvokeFunction"],
                            effect: iam.Effect.ALLOW,
                            resources: [
                                func.functionArn,
                                contactTracingTreeFunc.functionArn,
                                contactTracingFlatFunc.functionArn,
                            ],
                        }),
                    ],
                }),
            },
        });
        const traceExposureLambdaDataSource = new appsync.CfnDataSource(
            this,
            "traceExposureLambdaDataSource",
            {
                apiId: api.attrApiId,
                name: "TraceExposureDataSource",
                type: "AWS_LAMBDA",
                lambdaConfig: {
                    lambdaFunctionArn: func.functionArn,
                },
                serviceRoleArn: lambda_role.roleArn,
            }
        );
        traceExposureLambdaDataSource.addDependsOn(api_schema);
        const traceExposureQueryResolver = new appsync.CfnResolver(
            this,
            "traceExposureQueryResolver",
            {
                apiId: api.attrApiId,
                typeName: "Query",
                fieldName: "trace_exposure",
                dataSourceName: traceExposureLambdaDataSource.name,
            }
        );
        traceExposureQueryResolver.addDependsOn(traceExposureLambdaDataSource);

        const traceExposureTreeLambdaDataSource = new appsync.CfnDataSource(
            this,
            "traceExposureTreeLambdaDataSource",
            {
                apiId: api.attrApiId,
                name: "TraceExposureTreeDataSource",
                type: "AWS_LAMBDA",
                lambdaConfig: {
                    lambdaFunctionArn: contactTracingTreeFunc.functionArn,
                },
                serviceRoleArn: lambda_role.roleArn,
            }
        );
        traceExposureTreeLambdaDataSource.addDependsOn(api_schema);
        const traceExposureTreeQueryResolver = new appsync.CfnResolver(
            this,
            "traceExposureTreeQueryResolver",
            {
                apiId: api.attrApiId,
                typeName: "Query",
                fieldName: "trace_exposure_tree",
                dataSourceName: traceExposureTreeLambdaDataSource.name,
            }
        );
        traceExposureTreeQueryResolver.addDependsOn(
            traceExposureTreeLambdaDataSource
        );

        const traceExposureFlatLambdaDataSource = new appsync.CfnDataSource(
            this,
            "traceExposureFlatLambdaDataSource",
            {
                apiId: api.attrApiId,
                name: "TraceExposureFlatDataSource",
                type: "AWS_LAMBDA",
                lambdaConfig: {
                    lambdaFunctionArn: contactTracingFlatFunc.functionArn,
                },
                serviceRoleArn: lambda_role.roleArn,
            }
        );
        traceExposureFlatLambdaDataSource.addDependsOn(api_schema);
        const traceExposureFlatQueryResolver = new appsync.CfnResolver(
            this,
            "traceExposureFlatQueryResolver",
            {
                apiId: api.attrApiId,
                typeName: "Query",
                fieldName: "trace_exposure_flat",
                dataSourceName: traceExposureFlatLambdaDataSource.name,
            }
        );
        traceExposureFlatQueryResolver.addDependsOn(
            traceExposureFlatLambdaDataSource
        );

        new CfnOutput(this, "api-url", {
            value: api.attrGraphQlUrl,
        });
    }
}
