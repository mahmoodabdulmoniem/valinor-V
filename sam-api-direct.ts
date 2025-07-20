function formatDateForSAM(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

export async function fetchOpportunitiesFromSAM(params: {
  keyword?: string;
  postedFrom?: string;
  postedTo?: string;
  limit?: number;
  offset?: number;
  agency?: string;
  state?: string;
  ptype?: string;
  ncode?: string;
  typeOfSetAside?: string;
  fetchAllResults?: boolean;
  includeAttachments?: boolean;
  noticeId?: string;
}): Promise<{
  opportunitiesData: any[];
  totalRecords: number;
  source: string;
  totalFetched: number;
  totalAvailable: number;
  fetchedAllPages?: boolean;
}> {
  const { fetchAllResults = false, limit = 1000 } = params;
  const queryParams = new URLSearchParams();

  // Set default date range to last 90 days if not provided
  if (!params.postedFrom) {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    queryParams.set("postedFrom", formatDateForSAM(ninetyDaysAgo));
  } else {
    queryParams.set("postedFrom", params.postedFrom);
  }

  if (!params.postedTo) {
    queryParams.set("postedTo", formatDateForSAM(new Date()));
  } else {
    queryParams.set("postedTo", params.postedTo);
  }

  if (params.keyword) queryParams.set("q", params.keyword);
  if (params.agency) queryParams.set("deptname", params.agency);
  if (params.state) queryParams.set("state", params.state);
  if (params.ptype) queryParams.set("ptype", params.ptype);
  if (params.ncode) queryParams.set("ncode", params.ncode);
  if (params.typeOfSetAside) queryParams.set("typeOfSetAside", params.typeOfSetAside);
  if (params.noticeId) queryParams.set("noticeid", params.noticeId);

  if (fetchAllResults) {
    return await fetchAllOpportunitiesWithPagination(queryParams, limit);
  } else {
    queryParams.set("limit", (params.limit || 100).toString());
    queryParams.set("offset", (params.offset || 0).toString());
    return await fetchSinglePage(queryParams);
  }
}

async function fetchSinglePage(queryParams: URLSearchParams) {
  const API_BASE_URL = "https://api.sam.gov/opportunities/v2/search";
  const apiKey = process.env.SAM_KEY || process.env.NEXT_PUBLIC_SAM_KEY;
  const url = `${API_BASE_URL}?${queryParams.toString()}&api_key=${apiKey}`;

  const response = await fetch(url);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed with status ${response.status}: ${errorText}`);
  }
  const data = await response.json();
  return {
    opportunitiesData: data.opportunitiesData || [],
    totalRecords: data.totalRecords || 0,
    source: "sam-gov-api",
    totalFetched: (data.opportunitiesData || []).length,
    totalAvailable: data.totalRecords || 0,
  };
}

async function fetchAllOpportunitiesWithPagination(initialParams: URLSearchParams, limit: number) {
  let allOpportunities: any[] = [];
  let offset = 0;
  let totalAvailable = 0;
  let hasMore = true;
  let pageCount = 0;

  while (hasMore) {
    pageCount++;
    const queryParams = new URLSearchParams(initialParams);
    queryParams.set("limit", limit.toString());
    queryParams.set("offset", offset.toString());

    try {
      const pageResult = await fetchSinglePage(queryParams);
      const opportunities = pageResult.opportunitiesData;

      if (opportunities.length > 0) {
        allOpportunities = allOpportunities.concat(opportunities);
      }

      if (pageCount === 1) {
        totalAvailable = pageResult.totalRecords;
      }

      offset += opportunities.length;
      hasMore = offset < totalAvailable && opportunities.length > 0;

      // Safety break for runaway loops
      if (pageCount > 100) {
        hasMore = false;
      }

      // Add a small delay to avoid rate limiting
      if (hasMore) {
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    } catch (error) {
      hasMore = false; // Stop on error
    }
  }

  return {
    opportunitiesData: allOpportunities,
    totalRecords: totalAvailable,
    source: "sam-gov-api-paginated",
    totalFetched: allOpportunities.length,
    totalAvailable: totalAvailable,
    fetchedAllPages: true,
  };
} 