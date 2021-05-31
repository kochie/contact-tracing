package main

import (
	"context"
	"fmt"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"log"
	"os"
	"time"

	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
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
	Users []string `json:"users"`
	Locations []string `json:"locations"`
}

type User struct {
	 UserID string
	 Locations []Location
}

type Location struct {
	LocationId string
	Timestamp time.Time
}

type CheckIn struct {
	UserID string `dynamodbav:"user_id"`
	LocationID string `dynamodbav:"location_id"`
	CheckinDatetime time.Time `dynamodbav:"checkin_datetime"`
}

func GetLocation() () {}

func GetUser(userId, from, until string) (*User, error) {
	var expression string

	if from != "" && until != "" {
		expression = fmt.Sprintf(`user_id = %s AND checkin_datetime BETWEEN %s AND %s`, userId, from, until)
	} else if from == "" {
		expression = fmt.Sprintf(`user_id = %s AND checkin_datetime <= %s`, userId, until)
	} else if until == "" {
		expression = fmt.Sprintf(`user_id = %s AND checkin_datetime >= %s`, userId, from)
	} else {
		expression = fmt.Sprintf(`user_id = %s`, userId)
	}

	paginator := dynamodb.NewQueryPaginator(client, &dynamodb.QueryInput{
		TableName: aws.String(tableName),
		KeyConditionExpression: aws.String(expression),
	})
	//resp, err := client.Query(context.TODO(), &dynamodb.QueryInput{
	//	TableName: aws.String(tableName),
	//	KeyConditionExpression: aws.String(expression),
	//})

	user := User{}
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
			user.Locations = append(user.Locations, Location{
				Timestamp: checkin.CheckinDatetime,
				LocationId: checkin.LocationID,
			})
		}
	}

	return &user, nil
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

	user, err := GetUser(userId, from, until)
	if err != nil {
		return nil, err
	}

	locations := make([]string, 0)
	for _, location := range user.Locations {
		locations = append(locations, location.LocationId)
	}
	out := Exposures{
		Users: []string{user.UserID},
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