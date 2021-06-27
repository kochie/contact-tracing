package main

import (
	"context"
	"time"

	"github.com/aws/aws-lambda-go/lambda"
	"github.com/kochie/contact-tracing/lib/functions/common"
)

type User struct {
	UserId   string      `json:"user_id"`
	From     string      `json:"-"`
	Contacts []*Location `json:"contacts"`
}

type Location struct {
	Time       time.Time `json:"time"`
	LocationId string    `json:"location_id"`
	Visitors   []*User   `json:"visitors"`
}

func HandleRequest(ctx context.Context, event interface{}) (*User, error) {
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

	rootUser := User{UserId: userId, From: from, Contacts: make([]*Location, 0)}
	stack := []*User{&rootUser}

	for len(stack) > 0 {
		user := stack[0]
		from = user.From
		stack = stack[1:]

		if _, ok := seenUsers[user.UserId]; ok {
			continue
		}

		seenUsers[user.UserId] = true
		checkins, err := common.GetUserLocationHistory(user.UserId, from, until, ctx)
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

			users := make([]*User, 0)
			for _, visitor := range visitors {
				if _, ok := seenUsers[visitor.UserID]; ok {
					continue
				}

				u := User{visitor.UserID, checkin.CheckinDatetime.Format(time.RFC3339), make([]*Location, 0)}
				stack = append(stack, &u)
				users = append(users, &u)
			}

			user.Contacts = append(user.Contacts, &Location{
				checkin.CheckinDatetime,
				locationID,
				users,
			})
		}
	}

	return &rootUser, nil
}

func main() {
	lambda.Start(HandleRequest)
}
