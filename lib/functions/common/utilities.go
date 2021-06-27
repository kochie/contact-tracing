package common

import (
	"context"
	"github.com/aws/aws-dax-go/dax"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
	"github.com/aws/aws-xray-sdk-go/xray"
	"log"
	"os"
	"time"
)

var client *dax.Dax
//var client *dynamodb.Client
var tableName = os.Getenv("TABLE_NAME")

type CheckIn struct {
	UserID          string    `dynamodbav:"user_id"`
	LocationID      string    `dynamodbav:"location_id"`
	CheckinDatetime time.Time `dynamodbav:"checkin_datetime"`
	Latitude string `dynamodbav:"latitude"`
	Longitude string `dynamodbav:"longitude"`
}

func GetLocationVisitors(locationId, from, until string, ctx context.Context) ([]*CheckIn, error) {
	log.Println("GetLocationVisitors")
	var expression string
	expressionAttributeValues := map[string]types.AttributeValue{
		":location_id": &types.AttributeValueMemberS{Value: locationId},
	}

	if from != "" && until != "" {
		expression = `location_id = :location_id AND checkin_datetime BETWEEN :from AND :until`
		expressionAttributeValues[":from"] = &types.AttributeValueMemberS{Value: from}
		expressionAttributeValues[":until"] = &types.AttributeValueMemberS{Value: until}
	} else if until != "" {
		expression = `location_id = :location_id AND checkin_datetime <= :until`
		expressionAttributeValues[":until"] = &types.AttributeValueMemberS{Value: until}
	} else if from != "" {
		expression = `location_id = :location_id AND checkin_datetime >= :from`
		expressionAttributeValues[":from"] = &types.AttributeValueMemberS{Value: from}
	} else {
		expression = `location_id = :location_id`
	}

	paginator := dynamodb.NewQueryPaginator(client, &dynamodb.QueryInput{
		TableName:              aws.String(tableName),
		KeyConditionExpression: aws.String(expression),
		ExpressionAttributeValues: expressionAttributeValues,
	})

	locations := make([]*CheckIn, 0)
	for paginator.HasMorePages() {
		resp, err := paginator.NextPage(ctx)

		if err != nil {
			return nil, err
		}

		for _, item := range resp.Items {
			checkin := CheckIn{}
			err := attributevalue.UnmarshalMap(item, &checkin)
			if err != nil {
				return nil, err
			}

			locations = append(locations, &checkin)
		}
	}

	return locations, nil
}

func GetUserLocationHistory(userId, from, until string, ctx context.Context) ([]*CheckIn, error) {
	//log.Println("Starting GetUserLocationHistory")
	var expression string
	expressionAttributeValues := map[string]types.AttributeValue{
		":user_id": &types.AttributeValueMemberS{Value: userId},
	}

	if from != "" && until != "" {
		expression = `user_id = :user_id AND checkin_datetime BETWEEN :from AND :until`
		expressionAttributeValues[":from"] = &types.AttributeValueMemberS{Value: from}
		expressionAttributeValues[":until"] = &types.AttributeValueMemberS{Value: until}
	} else if until != "" {
		expression = `user_id = :user_id AND checkin_datetime <= :until`
		expressionAttributeValues[":until"] = &types.AttributeValueMemberS{Value: until}
	} else if from != "" {
		expression = `user_id = :user_id AND checkin_datetime >= :from`
		expressionAttributeValues[":from"] = &types.AttributeValueMemberS{Value: from}
	} else {
		expression = `user_id = :user_id`
	}

	paginator := dynamodb.NewQueryPaginator(client, &dynamodb.QueryInput{
		TableName:              aws.String(tableName),
		KeyConditionExpression: aws.String(expression),
		ExpressionAttributeValues: expressionAttributeValues,
		IndexName: aws.String("index_by_user"),
	})

	locations := make([]*CheckIn, 0)
	for paginator.HasMorePages() {
		//log.Println("Oh let me guess, this is gonna run like A BILLION TIMES")
		resp, err := paginator.NextPage(ctx)

		if err != nil {
			return nil, err
		}

		for _, item := range resp.Items {
			checkin := CheckIn{}
			err := attributevalue.UnmarshalMap(item, &checkin)
			if err != nil {
				return nil, err
			}
			locations = append(locations, &checkin)
		}
	}

	return locations, nil
}

func init() {
	daxEndpoint := os.Getenv("DAX_ENDPOINT")

	//log.Printf("DAX ENDPOINT %s", daxEndpoint)

	cfg, err := config.LoadDefaultConfig(context.TODO())
	if err != nil {
		log.Fatal(err)
	}

	err = xray.Configure(xray.Config{
		ServiceVersion:   "1.2.3",
	})

	if err != nil {
		log.Fatal(err)
	}

	xray.AppendMiddlewares(&cfg.APIOptions)

	daxCfg := dax.DefaultConfig()
	daxCfg.HostPorts = []string{daxEndpoint}
	daxCfg.Region = "ap-southeast-2"
	daxCfg.RequestTimeout = 5 * time.Minute
	client, err = dax.New(daxCfg)
	if err != nil {
		log.Fatal(err)
	}

	//client = dynamodb.NewFromConfig(cfg)
}
