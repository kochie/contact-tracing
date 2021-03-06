package main

import (
	"context"
	"github.com/kochie/contact-tracing/lib/functions/common"
	"time"

	"github.com/aws/aws-lambda-go/lambda"
)

type Exposures struct {
	Users     []string `json:"users"`
	Locations []string `json:"locations"`
}

// HandleRequest will contact-trace a user_id throughout a time period
// and identify all the locations and other users that the user has come
// into contact with
func HandleRequest(ctx context.Context, event interface{}) (*Exposures, error) {
	eventData := event.(map[string]interface{})
	arguments := eventData["arguments"].(map[string]interface{})
	userId := arguments["user_id"].(string)
	from := ""
	if _, ok := arguments["from"].(string); ok {
		from = arguments["from"].(string)
	}
	until := ""
	if _, ok := arguments["until"].(string); ok {
		until = arguments["until"].(string)
	}

	seenUsers := make(map[string]bool)
	seenLocations := make(map[string]bool)

	stack := [][]string{{userId, from}}

	for len(stack) > 0 {
		user := stack[0][0]
		from = stack[0][1]
		stack = stack[1:]

		if _, ok := seenUsers[user]; ok {
			continue
		}

		seenUsers[user] = true
		checkins, err := common.GetUserLocationHistory(user, from, until, ctx)
		if err != nil {
			return nil, err
		}
		for _, checkin := range checkins {
			locationID := checkin.LocationID
			if _, ok := seenLocations[locationID]; ok {
				continue
			}
			seenLocations[locationID] = true

			f := checkin.CheckinDatetime.Add(-time.Hour).Format(time.RFC3339)
			u := checkin.CheckinDatetime.Add(time.Hour).Format(time.RFC3339)
			visitors, err := common.GetLocationVisitors(locationID, f, u, ctx)
			if err != nil {
				return nil, err
			}

			for _, visitor := range visitors {
				stack = append(stack, []string{visitor.UserID, f})
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

