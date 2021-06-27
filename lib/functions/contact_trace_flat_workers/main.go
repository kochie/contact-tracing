package main

import (
	"context"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/kochie/contact-tracing/lib/functions/common"
	"log"
	"sync"
	"time"
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
	Nodes []*Node `json:"nodes"`
	Links []*Link `json:"links"`
}

//const numberOfWorkers = 20
//var jobs = make(chan locationJob, 2000)
//var results = make(chan locationResult, 2000)

func HandleRequest(ctx context.Context, event interface{}) (*Output, error) {
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
	//dos := -1
	//if _, ok := arguments["deg_of_sep"].(int); ok {
	//	dos = arguments["deg_of_sep"].(int)
	//}


	rootUser := User{UserId: userId, From: from, Contacts: make([]*Location, 0)}
	stack := []*User{&rootUser}


	seenUsers := make(map[string]*User)
	seenLocations := make(map[string]bool)
	targets := make(map[string]bool)

	//current_dos := 0

	output := Output{
		Links: make([]*Link, 0),
		Nodes: make([]*Node, 0),
	}

	var mutex = &sync.Mutex{}

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

		wg := new(sync.WaitGroup)

		log.Printf("visitor checked into %d places", len(checkins))

		for i, _checkin := range checkins {
			wg.Add(1)

			i := i
			go func(checkin *common.CheckIn) {
				defer wg.Done()
				mutex.Lock()
				locationID := checkin.LocationID
				if _, ok := seenLocations[locationID]; ok {
					mutex.Unlock()
					return
				}
				seenLocations[locationID] = true
				mutex.Unlock()

				f := checkin.CheckinDatetime.Add(-time.Hour).Format(time.RFC3339)
				u := checkin.CheckinDatetime.Add(time.Hour).Format(time.RFC3339)
				log.Println("getting location", locationID, i)
				visitors, err := common.GetLocationVisitors(locationID, f, u, ctx)
				if err != nil {
					log.Println(err.Error())
					return
				}
				log.Printf("number of visitors for location %s - %d", locationID, len(visitors))

				for _, visitor := range visitors {
					if _, ok := seenUsers[visitor.UserID]; ok {
						continue
					}

					u := User{visitor.UserID, checkin.CheckinDatetime.Format(time.RFC3339), make([]*Location, 0)}
					t := visitor.CheckinDatetime
					if checkin.CheckinDatetime.After(visitor.CheckinDatetime) {
						t = checkin.CheckinDatetime
					}

					mutex.Lock()
					stack = append(stack, &u)

					if _, ok := targets[visitor.UserID]; ok {
						mutex.Unlock()
						continue
					}
					targets[visitor.UserID] = true

					output.Links = append(output.Links, &Link{Time: t, Source: user.UserId, Target: visitor.UserID, LocationId: locationID})
					mutex.Unlock()
				}
			}(_checkin)
		}
		log.Println("and now we wait...")
		wg.Wait()
		log.Println("wait over")
	}


	return &output, nil
}

//type locationJob struct {
//	locationID string
//	f string
//	u string
//	ctx context.Context
//}
//
//type locationResult struct {
//	visitors []*common.CheckIn
//	err error
//}
//
//func getLocationVisitorsWorker(jobs <-chan locationJob, results chan<- locationResult) {
//	for j := range jobs {
//		visitors, err := common.GetLocationVisitors(j.locationID, j.f, j.u, j.ctx)
//		results <- locationResult{visitors: visitors, err: err}
//	}
//}

func main() {
	lambda.Start(HandleRequest)

	//for w := 1; w <= numberOfWorkers; w++ {
	//	go getLocationVisitorsWorker(jobs, results)
	//}
}
