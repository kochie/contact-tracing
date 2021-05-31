import {DynamoDBClient, BatchWriteItemCommand} from "@aws-sdk/client-dynamodb";

const gaussian = require('gaussian')

const numberOfUsers = 10_000
const numberOfLocations = 1_000
const averageLocationPerUser = 25
const startDate = new Date("2021-05-20T00:00:00+10:00")
const endDate = new Date("2021-05-30T00:00:00+10:00")

function randomDate(start: Date, end: Date) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function generateCheckins() {
    const dist = gaussian(averageLocationPerUser, 10)
    const checkins = []
    for (let user = 1; user < numberOfUsers; user++) {
        const number_locations_visited = dist.ppf(Math.random())

        let locations = Array.from({length: number_locations_visited}, () => ({
            location_id: getRandomInt(1, numberOfLocations+1),
            checkin_datetime: randomDate(startDate, endDate),
            user_id: user
        }))
        // console.log(locations.length)

        checkins.push(...locations)
    }
    return checkins
}

function getRandomInt(min: number, max: number) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min) + min); //The maximum is exclusive and the minimum is inclusive
}


// console.log("hello")
// for (let _ = 0; _ < 10; _++) {
//     // console.log("hello")
//     const date = randomDate(startDate, endDate)
//     console.log(date.toJSON())
// }

const checkins = generateCheckins()
console.log(checkins.length)

const client = new DynamoDBClient({})
const tableName = process.env["TABLE_NAME"] || "";

(async () => {
    for (let i = 0; i < checkins.length; i += 25) {
        const items = checkins.slice(i, i + 25)
        const input = {
            RequestItems: {
                [tableName]: items.map(item => ({
                    PutRequest: {
                        Item: {
                            checkin_datetime: {"S": item.checkin_datetime.toJSON()},
                            location_id: {"S": item.location_id.toString()},
                            user_id: {"S": item.user_id.toString()},
                        }
                    }
                }))
            }
        }
        const command = new BatchWriteItemCommand(input)
        try {
            await client.send(command);
            // console.log(results);
            // console.log("hello")
        } catch (err) {
            console.error(err);
        }
    }
})()
