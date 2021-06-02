package main

import (
	"context"
	"log"
	"os"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"

	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
)

var client *dynamodb.Client
var tableName = os.Getenv("TABLE_NAME")

type Event struct {
	UserID  string    `json:"userId"`
	From    time.Time `json:"from"`
	Until   time.Time `json:"until"`
	Degrees int       `json:"degrees"`
}

type Exposures struct {
	Users     []string `json:"users"`
	Locations []string `json:"locations"`
}

type CheckIn struct {
	UserID          string    `dynamodbav:"user_id"`
	LocationID      string    `dynamodbav:"location_id"`
	CheckinDatetime time.Time `dynamodbav:"checkin_datetime"`
}

func GetLocationVisitors(locationId, from, until string) ([]*CheckIn, error) {
	var expression string

	if from != "" && until != "" {
		expression = `location_id = :location_id AND checkin_datetime BETWEEN :from AND :until`
	} else if from == "" {
		expression = `location_id = :location_id AND checkin_datetime <= :until`
	} else if until == "" {
		expression = `location_id = :location_id AND checkin_datetime >= :from`
	} else {
		expression = `location_id = :location_id`
	}

	paginator := dynamodb.NewQueryPaginator(client, &dynamodb.QueryInput{
		TableName:              aws.String(tableName),
		KeyConditionExpression: aws.String(expression),
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":location_id": &types.AttributeValueMemberS{Value: locationId},
			":from":        &types.AttributeValueMemberS{Value: from},
			":until":       &types.AttributeValueMemberS{Value: until},
		},
	})

	locations := make([]*CheckIn, 0)
	for paginator.HasMorePages() {
		resp, err := paginator.NextPage(context.TODO())

		if err != nil {
			return nil, err
		}

		for _, item := range resp.Items {
			checkin := CheckIn{}
			err := attributevalue.UnmarshalMap(item, checkin)
			if err != nil {
				return nil, err
			}

			locations = append(locations, &checkin)
		}
	}

	return locations, nil
}

func GetUserLocationHistory(userId, from, until string) ([]*CheckIn, error) {
	var expression string

	if from != "" && until != "" {
		expression = `user_id = :user_id AND checkin_datetime BETWEEN :from AND :until`
	} else if from == "" {
		expression = `user_id = :user_id AND checkin_datetime <= :until`
	} else if until == "" {
		expression = `user_id = :user_id AND checkin_datetime >= :from`
	} else {
		expression = `user_id = :user_id`
	}

	paginator := dynamodb.NewQueryPaginator(client, &dynamodb.QueryInput{
		TableName:              aws.String(tableName),
		KeyConditionExpression: aws.String(expression),
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":user_id": &types.AttributeValueMemberS{Value: userId},
			":from":    &types.AttributeValueMemberS{Value: from},
			":until":   &types.AttributeValueMemberS{Value: until},
		},
		IndexName: aws.String("index_by_user"),
	})

	locations := make([]*CheckIn, 0)
	for paginator.HasMorePages() {
		resp, err := paginator.NextPage(context.TODO())

		if err != nil {
			return nil, err
		}

		for _, item := range resp.Items {
			checkin := CheckIn{}
			err := attributevalue.UnmarshalMap(item, checkin)
			if err != nil {
				return nil, err
			}
			locations = append(locations, &checkin)
		}
	}

	return locations, nil
}

// HandleRequest will contact-trace a user_id throughout a time period
// and identify all the locations and other users that the user has come
// into contact with
func HandleRequest(ctx context.Context, event interface{}) (*Exposures, error) {
	eventData := event.(map[string]interface{})
	arguments := eventData["arguments"].(map[string]interface{})
	userId := arguments["user_id"].(string)
	from := arguments["from"].(string)
	until := arguments["until"].(string)

	seenUsers := make(map[string]bool)
	seenLocations := make(map[string]bool)

	stack := []string{userId}

	for len(stack) > 0 {
		user := stack[0]
		stack = stack[1:]

		if _, ok := seenUsers[user]; ok {
			continue
		}

		seenUsers[user] = true
		checkins, err := GetUserLocationHistory(userId, from, until)
		if err != nil {
			return nil, err
		}
		for _, checkin := range checkins {
			locationID := checkin.LocationID
			if _, ok := seenLocations[locationID]; ok {
				continue
			}
			seenLocations[locationID] = true

			visitors, err := GetLocationVisitors(locationID, from, until)
			if err != nil {
				return nil, err
			}

			for _, visitor := range visitors {
				stack = append(stack, visitor.UserID)
			}
		}
	}

	users := make([]string, 0)
	for user := range seenUsers {
		users = append(users, user)
	}

	locations := make([]string, 0)
	for location := range seenLocations {
		locations = append(locations, location)
	}

	out := Exposures{
		Users:     users,
		Locations: locations,
	}
	return &out, nil
}

func main() {
	lambda.Start(HandleRequest)
}

func init() {
	cfg, err := config.LoadDefaultConfig(context.TODO())
	if err != nil {
		log.Fatal(err)
	}

	client = dynamodb.NewFromConfig(cfg)
}
