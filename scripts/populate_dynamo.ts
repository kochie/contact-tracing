import {BatchWriteItemCommand, DynamoDBClient} from "@aws-sdk/client-dynamodb";
import {generateCheckins, generateLocationGeoData} from "./generate_data";


const client = new DynamoDBClient({})
const checkinTable = process.env["CHECKIN_TABLE_NAME"] || "";
const locationTable = process.env["LOCATION_TABLE_NAME"] || "";

const checkins = generateCheckins()
const l = generateLocationGeoData()
const locations = new Map<number, {latitude: number, longitude: number, location_id: number}>()
l.forEach(lo => {
    locations.set(lo.location_id, lo)
})

const sendToDynamo = async () => {
    for (let i = 0; i < checkins.length; i += 25) {
        const items = checkins.slice(i, i + 25)
        const input = {
            RequestItems: {
                [checkinTable]: items.map(item => ({
                    PutRequest: {
                        Item: {
                            checkin_datetime: {"S": item.checkin_datetime.toJSON()},
                            location_id: {"S": item.location_id.toString()},
                            user_id: {"S": item.user_id.toString()},
                            latitude: {"S": locations.get(item.location_id)?.latitude.toString() || ""},
                            longitude: {"S": locations.get(item.location_id)?.longitude.toString() || ""}
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

    for (let i = 0; i < l.length; i += 25) {
        const items = l.slice(i, i + 25)
        const input = {
            RequestItems: {
                [locationTable]: items.map(item => ({
                    PutRequest: {
                        Item: {
                            location_id: {"S": item.location_id.toString()},
                            latitude: {"S": item.latitude.toString()},
                            longitude: {"S": item.longitude.toString()},
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
}

sendToDynamo()
