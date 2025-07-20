import { fetchOpportunitiesFromSAM } from "./sam-api-direct";
import { mapOpportunityToBid } from "./sam-api";
import { storeBidsInDynamoDB } from "./dynamo-service";

export async function syncBidsFromSamGov(params: any) {
  try {
    const { opportunitiesData } = await fetchOpportunitiesFromSAM(params);
    if (!opportunitiesData || opportunitiesData.length === 0) {
      console.log("No opportunities found.");
      return;
    }
    const bids = opportunitiesData.map(mapOpportunityToBid);
    await storeBidsInDynamoDB(bids);
    console.log(`Synced ${bids.length} bids to DynamoDB.`);
  } catch (error) {
    console.error("Error syncing bids from SAM.gov:", error);
  }
} 