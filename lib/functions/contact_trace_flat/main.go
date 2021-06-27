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

type LocationFlat struct {
	LocationId string `json:"location_id"`
	Latitude   string `json:"latitude"`
	Longitude  string `json:"longitude"`
}

type Node struct {
	UserId string `json:"user_id"`
}

type Link struct {
	Source     string    `json:"source"`
	Target     string    `json:"target"`
	Time       time.Time `json:"time"`
	LocationId string    `json:"location_id"`
}

type Output struct {
	Nodes     []*Node         `json:"nodes"`
	Links     []*Link         `json:"links"`
	Locations []*LocationFlat `json:"locations"`
}

func HandleRequest(ctx context.Context, event interface{}) (*Output, error) {
	//log.Println("Starting Request")
	//start := time.Now()
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

	seenUsers := make(map[string]*User)
	seenLocations := make(map[string]bool)
	targets := make(map[string]bool)

	rootUser := User{UserId: userId, From: from, Contacts: make([]*Location, 0)}
	stack := []*User{&rootUser}

	output := Output{
		Links:     make([]*Link, 0),
		Nodes:     make([]*Node, 0),
		Locations: make([]*LocationFlat, 0),
	}

	for len(stack) > 0 {
		user := stack[0]
		from = user.From
		stack = stack[1:]

		if _, ok := seenUsers[user.UserId]; ok {
			continue
		}

		seenUsers[user.UserId] = user
		checkins, err := common.GetUserLocationHistory(user.UserId, from, until, ctx)
		if err != nil {
			return nil, err
		}

		output.Nodes = append(output.Nodes, &Node{
			user.UserId,
		})

		for _, checkin := range checkins {
			locationID := checkin.LocationID
			latitude := checkin.Latitude
			longitude := checkin.Longitude
			if _, ok := seenLocations[locationID]; ok {
				continue
			}
			seenLocations[locationID] = true
			output.Locations = append(output.Locations, &LocationFlat{LocationId: locationID, Longitude: longitude, Latitude: latitude})

			f := checkin.CheckinDatetime.Add(-time.Hour).Format(time.RFC3339)
			u := checkin.CheckinDatetime.Add(time.Hour).Format(time.RFC3339)
			visitors, err := common.GetLocationVisitors(locationID, f, u, ctx)
			if err != nil {
				return nil, err
			}

			for _, visitor := range visitors {
				if _, ok := seenUsers[visitor.UserID]; ok {
					continue
				}

				u := User{visitor.UserID, checkin.CheckinDatetime.Format(time.RFC3339), make([]*Location, 0)}
				stack = append(stack, &u)
				t := visitor.CheckinDatetime
				if checkin.CheckinDatetime.After(visitor.CheckinDatetime) {
					t = checkin.CheckinDatetime
				}
				if _, ok := targets[visitor.UserID]; ok {
					continue
				}
				targets[visitor.UserID] = true

				output.Links = append(output.Links, &Link{Time: t, Source: user.UserId, Target: visitor.UserID, LocationId: locationID})
			}
		}
	}

	return &output, nil
}

func main() {
	lambda.Start(HandleRequest)
}
