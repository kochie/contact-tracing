import {paginateScan, DynamoDBClient, BatchWriteItemCommand} from "@aws-sdk/client-dynamodb";

const tableName = process.env["TABLE_NAME"] || "";

const client = new DynamoDBClient({})
const paginatorConfig = {
    client,
    pageSize: 25
};
const commandParams = {
    TableName: tableName
};
const paginator = paginateScan(paginatorConfig, commandParams);

(async () => {
    for await (const page of paginator) {
        if (!page.Items || page.Items.length == 0) break
        const input = {
            RequestItems: {
                [tableName]: page.Items.map(item => ({
                    DeleteRequest: {
                        Key: {
                            checkin_datetime: item.checkin_datetime,
                            location_id: item.location_id,
                        }
                    }
                }))
            }
        }
        const command = new BatchWriteItemCommand(input)
        try {
            await client.send(command);
            // console.log(results);
            console.log(page.LastEvaluatedKey)
            // console.log("hello")
        } catch (err) {
            console.error(err);
        }
    }
})()
