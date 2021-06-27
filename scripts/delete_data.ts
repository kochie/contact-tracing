import {paginateScan, DynamoDBClient, BatchWriteItemCommand} from "@aws-sdk/client-dynamodb";

const checkinTable = process.env["CHECKIN_TABLE_NAME"] || "";
const locationTable = process.env["LOCATION_TABLE_NAME"] || "";

const client = new DynamoDBClient({})
const paginatorConfig = {
    client,
    pageSize: 25
};
const checkinTablePaginator = paginateScan(paginatorConfig, {TableName: checkinTable});
const locationTablePaginator = paginateScan(paginatorConfig, {TableName: locationTable});

(async () => {
    for await (const page of checkinTablePaginator) {
        if (!page.Items || page.Items.length == 0) break
        const input = {
            RequestItems: {
                [checkinTable]: page.Items.map(item => ({
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

    for await (const page of locationTablePaginator) {
        if (!page.Items || page.Items.length == 0) break
        const input = {
            RequestItems: {
                [checkinTable]: page.Items.map(item => ({
                    DeleteRequest: {
                        Key: {
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
