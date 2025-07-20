import { DynamoDBClient, BatchWriteItemCommand } from "@aws-sdk/client-dynamodb";
import type { Bid } from "@/types";

const TABLE_NAME =
  process.env.DYNAMODB_TABLE ||
  process.env.DYNAMODB_CONTRACTS_TABLE ||
  "opengovtbids-contracts-optimized";

const client = new DynamoDBClient({ region: "us-east-1" });

export async function storeBidsInDynamoDB(bids: Bid[]) {
  if (!TABLE_NAME) {
    throw new Error("No DynamoDB table name configured.");
  }

  // DynamoDB batch write supports up to 25 items per request
  const chunkSize = 25;
  for (let i = 0; i < bids.length; i += chunkSize) {
    const chunk = bids.slice(i, i + chunkSize);
    const putRequests = chunk.map((bid) => ({
      PutRequest: {
        Item: marshallBid(bid),
      },
    }));

    const params = {
      RequestItems: {
        [TABLE_NAME]: putRequests,
      },
    };

    try {
      await client.send(new BatchWriteItemCommand(params));
      console.log(`Wrote ${chunk.length} bids to ${TABLE_NAME}`);
    } catch (error) {
      console.error("Error writing to DynamoDB:", error);
    }
  }
}

// Helper to convert Bid object to DynamoDB format
function marshallBid(bid: Bid): { [key: string]: any } {
  // You may want to use @aws-sdk/util-dynamodb's marshall() for this
  // For now, a simple conversion:
  return {
    id: { S: bid.id },
    title: { S: bid.title },
    agency: { S: bid.agency },
    postedDate: { S: bid.postedDate },
    deadline: { S: bid.deadline },
    solicitationNumber: { S: bid.solicitationNumber },
    setAside: { S: bid.setAside },
    naicsCode: { S: bid.naicsCode },
    type: { S: bid.type },
    description: { S: bid.description },
    status: { S: bid.status },
    // Add other fields as needed
  };
}
