import {BatchWriteItemCommand, DynamoDBClient} from "@aws-sdk/client-dynamodb";
import {generateCheckins} from "./generate_data";


const client = new DynamoDBClient({})
const tableName = process.env["TABLE_NAME"] || "";

const checkins = generateCheckins()

const sendToDynamo = async () => {
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
}

await sendToDynamo()