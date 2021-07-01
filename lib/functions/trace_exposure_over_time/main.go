package main

import (
	"context"
	"errors"
	"log"
	"math"
	"time"

	"github.com/aws/aws-lambda-go/lambda"
	"github.com/kochie/contact-tracing/lib/functions/common"
)

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
	Latitude   string    `json:"latitude"`
	Longitude  string    `json:"longitude"`
}

type Output struct {
	Nodes     []*Node         `json:"nodes"`
	Links     []*Link         `json:"links"`
	Locations []*LocationFlat `json:"locations"`
}

type User struct {
	UserID string
	From   time.Time
	Depth  int
}

func HandleRequest(ctx context.Context, event interface{}) ([]*Output, error) {

	eventData := event.(map[string]interface{})
	arguments := eventData["arguments"].(map[string]interface{})
	userId := arguments["user_id"].(string)
	from := time.Date(1970, time.January, 1, 0, 0, 0, 0, time.UTC)
	if f, ok := arguments["from"].(string); ok {
		fr, err := time.Parse(time.RFC3339, f)
		if err != nil {
			return nil, err
		}
		from = fr
		// from = from
	}
	until := time.Now()
	if u, ok := arguments["until"].(string); ok {
		un, err := time.Parse(time.RFC3339, u)
		if err != nil {
			return nil, err
		}
		until = un
		// until = until
	}
	step := 24
	if _, ok := arguments["step"].(int); ok {
		step = arguments["step"].(int)
	}
	depth := -1
	if _, ok := arguments["until"].(int); ok {
		depth = arguments["until"].(int)
	}

	// exposedUsers := []string{userId}

	d := until.Sub(from)
	if d <= 0 {
		return nil, errors.New("time difference must be positive")
	}

	steps := int(math.Ceil(d.Hours() / float64(step)))
	output := make([]*Output, steps)
	for i := range output {
		output[i] = &Output{
			Links:     make([]*Link, 0),
			Nodes:     make([]*Node, 0),
			Locations: make([]*LocationFlat, 0),
		}
	}

	stack := []*User{{userId, from, 0}}

	seenUsers := make(map[string]bool)
	seenLocations := make(map[string]bool)
	// it's possible someone can be exposed twice, by running into an exposed person again.
	// If that happens it's not a tree made anymore, need to keep account of this.
	targets := make(map[string]bool)

	for len(stack) > 0 {
		user := stack[0]
		// from = user.From
		stack = stack[1:]

		if _, ok := seenUsers[user.UserID]; ok {
			continue
		}
		seenUsers[user.UserID] = true
		if user.Depth > depth && depth > -1 {
			continue
		}

		since := int(math.Floor(user.From.Sub(from).Hours() / float64(step)))
		output[since].Nodes = append(output[since].Nodes, &Node{user.UserID})

		checkins, err := common.GetUserLocationHistory(user.UserID, user.From.Format(time.RFC3339), until.Format(time.RFC3339), ctx)
		if err != nil {
			log.Println("Failed to get user location history: ", err.Error())
			return nil, err
		}

		for _, checkin := range checkins {
			locationID := checkin.LocationID
			latitude := checkin.Latitude
			longitude := checkin.Longitude
			if _, ok := seenLocations[locationID]; ok {
				continue
			}
			seenLocations[locationID] = true

			since = int(math.Floor(checkin.CheckinDatetime.Sub(from).Hours() / float64(step)))
			output[since].Locations = append(output[since].Locations, &LocationFlat{LocationId: locationID, Longitude: longitude, Latitude: latitude})

			f := checkin.CheckinDatetime.Add(-time.Hour).Format(time.RFC3339)
			u := checkin.CheckinDatetime.Add(time.Hour).Format(time.RFC3339)

			visitors, err := common.GetLocationVisitors(locationID, f, u, ctx)
			if err != nil {
				log.Println("Failed to get location visitor history: ", err.Error())
				return nil, err
			}

			for _, visitor := range visitors {
				if _, ok := seenUsers[visitor.UserID]; ok {
					continue
				}

				u := User{visitor.UserID, checkin.CheckinDatetime, user.Depth + 1}
				stack = append(stack, &u)
				t := visitor.CheckinDatetime
				if checkin.CheckinDatetime.After(visitor.CheckinDatetime) {
					t = checkin.CheckinDatetime
				}
				if _, ok := targets[visitor.UserID]; ok {
					continue
				}
				targets[visitor.UserID] = true

				since = int(math.Floor(t.Sub(from).Hours() / float64(step)))

				output[since].Links = append(output[since].Links, &Link{Time: t, Source: user.UserID, Target: visitor.UserID, LocationId: locationID, Longitude: longitude, Latitude: latitude})
			}
		}
	}

	return output, nil
}

func main() {
	lambda.Start(HandleRequest)
}
