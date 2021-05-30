package main

import (
	"context"
	"fmt"
	"github.com/aws/aws-sdk-go-v2/aws"
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

type Contact struct {
}

type Output struct {
	Contacts []Contact `json:"contact"`
}

// HandleRequest will contact-trace a user_id throughout a time period
// and identify all the locations and other users that the user has come
// into contact with
func HandleRequest(ctx context.Context, event Event) (*Output, error) {
	resp, err := client.Query(ctx, &dynamodb.QueryInput{
		TableName: aws.String(tableName),
		KeyConditionExpression: aws.String(fmt.Sprintf(`
user_id = %s
`, event.UserID)),
	})
	if err != nil {
		return nil, err
	}

	log.Println(resp.Items)

	out := Output{}
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