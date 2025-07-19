"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchSAMGovAPI = void 0;
const https = __importStar(require("https"));
const SAM_KEY = process.env.SAM_API_KEY || 'PRgPCfuCFEeuxk489Gak3ZJEO9UILH0AQyrXGSWr';
const API_BASE_URL = "https://api.sam.gov/opportunities/v2/search";
// Helper function to safely serialize objects without circular references
function safeSerialize(obj) {
    if (obj === null || obj === undefined) {
        return obj;
    }
    if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
        return obj;
    }
    if (Array.isArray(obj)) {
        return obj.map(item => safeSerialize(item));
    }
    if (typeof obj === 'object') {
        const result = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key) && key !== '_idlePrev' && key !== '_idleNext' && key !== '_idleStart' && key !== '_idleTimeout') {
                try {
                    result[key] = safeSerialize(obj[key]);
                }
                catch (error) {
                    result[key] = '[Circular Reference]';
                }
            }
        }
        return result;
    }
    return obj;
}
// Helper function to make HTTPS requests
function makeHttpsRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const request = https.get(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(data);
                }
                else {
                    reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                }
            });
        });
        request.on('error', (error) => {
            // Clean up any circular references in the error object
            const cleanError = new Error(error.message || 'Request failed');
            reject(cleanError);
        });
        request.setTimeout(30000, () => {
            request.destroy();
            reject(new Error('Request timeout'));
        });
    });
}
// Enhanced Notice ID type detection and normalization
function analyzeNoticeId(noticeId) {
    const normalized = noticeId.trim();
    const patterns = [normalized];
    // API Notice ID pattern (32 character hex string)
    if (/^[a-f0-9]{32}$/i.test(normalized)) {
        return {
            type: 'api',
            normalized,
            patterns: [normalized]
        };
    }
    // Website Notice ID patterns (various formats)
    const websitePatterns = [
        // Common patterns like OHND06252025DCA, SPE8EE25T2086, N0040625QS347, etc.
        /^[A-Z]{2,6}\d{6,8}[A-Z]{2,4}$/i,
        /^[A-Z]{2,6}-\d{2}-[A-Z]-\d{4,6}$/i,
        /^[A-Z]{2,6}\d{2}[A-Z]\d{4,6}$/i,
        // Patterns with underscores
        /^[A-Z0-9_]+$/i,
        // Patterns with dashes
        /^[A-Z0-9-]+$/i
    ];
    for (const pattern of websitePatterns) {
        if (pattern.test(normalized)) {
            // Generate variations for better matching
            const variations = [
                normalized,
                normalized.toUpperCase(),
                normalized.toLowerCase(),
                normalized.replace(/-/g, ''),
                normalized.replace(/_/g, ''),
                normalized.replace(/_/g, '-'),
                normalized.replace(/-/g, '_')
            ];
            // Add partial matches for complex IDs
            if (normalized.includes('-')) {
                const parts = normalized.split('-');
                variations.push(...parts);
                if (parts.length >= 2) {
                    variations.push(`${parts[0]}-${parts[1]}`);
                    variations.push(`${parts[0]}-${parts[parts.length - 1]}`);
                }
            }
            return {
                type: 'website',
                normalized,
                patterns: [...new Set(variations)]
            };
        }
    }
    // Solicitation number patterns
    const solicitationPatterns = [
        /^[A-Z]{2,6}\d{2,4}[A-Z]?\d{2,4}[A-Z]?\d{2,4}$/i,
        /^[A-Z]{2,6}-\d{2,4}-[A-Z]-\d{2,4}$/i
    ];
    for (const pattern of solicitationPatterns) {
        if (pattern.test(normalized)) {
            return {
                type: 'solicitation',
                normalized,
                patterns: [normalized, normalized.toUpperCase(), normalized.toLowerCase()]
            };
        }
    }
    return {
        type: 'unknown',
        normalized,
        patterns: [normalized, normalized.toUpperCase(), normalized.toLowerCase()]
    };
}
// Format date for SAM.gov API
function formatDateForSAM(date) {
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
}
// Enhanced SAM.gov API search with multiple strategies and validation
async function searchSAMGovAPI(noticeId, output) {
    output.appendLine(`[VALINOR INFO] Searching SAM.gov API for Notice ID: ${noticeId}`);
    const analysis = analyzeNoticeId(noticeId);
    output.appendLine(`[VALINOR DEBUG] Notice ID Analysis:`);
    output.appendLine(`[VALINOR DEBUG]   Type: ${analysis.type}`);
    output.appendLine(`[VALINOR DEBUG]   Normalized: ${analysis.normalized}`);
    output.appendLine(`[VALINOR DEBUG]   Patterns: ${analysis.patterns.join(', ')}`);
    // Set up date range (required by SAM.gov API)
    const today = new Date();
    const startDate = new Date(today.getTime() - 180 * 24 * 60 * 60 * 1000); // 180 days back
    const endDate = new Date(today.getTime() + 180 * 24 * 60 * 60 * 1000); // 180 days forward
    const postedFrom = formatDateForSAM(startDate);
    const postedTo = formatDateForSAM(endDate);
    output.appendLine(`[VALINOR DEBUG] Using date range: ${postedFrom} to ${postedTo}`);
    // Strategy 1: Try API Notice ID search (MOST RELIABLE)
    if (analysis.type === 'api') {
        try {
            output.appendLine(`[VALINOR DEBUG] Trying API Notice ID search (MOST RELIABLE)`);
            const params = new URLSearchParams({
                noticeid: noticeId,
                limit: '10',
                postedFrom: postedFrom,
                postedTo: postedTo
            });
            const url = `${API_BASE_URL}?${params.toString()}&api_key=${SAM_KEY}`;
            const response = await makeHttpsRequest(url);
            const data = JSON.parse(response);
            if (data.opportunitiesData && data.opportunitiesData.length > 0) {
                const contract = data.opportunitiesData[0];
                // Validate that the returned contract matches our API Notice ID
                if (contract.noticeId === noticeId) {
                    output.appendLine(`[VALINOR SUCCESS] Found contract with API Notice ID`);
                    output.appendLine(`[VALINOR INFO] Title: ${contract.title || 'N/A'}`);
                    output.appendLine(`[VALINOR INFO] Agency: ${contract.fullParentPathName || 'N/A'}`);
                    output.appendLine(`[VALINOR INFO] Posted: ${contract.postedDate || 'N/A'}`);
                    output.appendLine(`[VALINOR INFO] Deadline: ${contract.responseDeadLine || 'N/A'}`);
                    output.appendLine(`[VALINOR INFO] API Notice ID: ${contract.noticeId || 'N/A'}`);
                    output.appendLine(`[VALINOR INFO] Solicitation Number: ${contract.solicitationNumber || 'N/A'}`);
                    return safeSerialize(contract);
                }
                else {
                    output.appendLine(`[VALINOR ERROR] API Notice ID mismatch!`);
                    output.appendLine(`[VALINOR ERROR]   Requested: ${noticeId}`);
                    output.appendLine(`[VALINOR ERROR]   Returned: ${contract.noticeId}`);
                }
            }
        }
        catch (error) {
            output.appendLine(`[VALINOR ERROR] API Notice ID search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    // Strategy 2: Try solicitation number search with client-side filtering (REQUIRED due to broken API)
    if (analysis.type === 'website' || analysis.type === 'solicitation') {
        for (const pattern of analysis.patterns) {
            try {
                output.appendLine(`[VALINOR DEBUG] Trying solicitation number search with: ${pattern}`);
                output.appendLine(`[VALINOR WARNING] SAM.gov API has a known bug - solicitationNumber parameter is ignored`);
                output.appendLine(`[VALINOR DEBUG] Will search all contracts and filter client-side`);
                // Search all contracts in date range (API ignores solicitationNumber parameter)
                // Use pagination to get all contracts, not just the first 1000
                let allContracts = [];
                let offset = 0;
                const limit = 1000;
                let hasMore = true;
                output.appendLine(`[VALINOR DEBUG] Using pagination to get all contracts in date range...`);
                while (hasMore) {
                    const params = new URLSearchParams({
                        limit: limit.toString(),
                        offset: offset.toString(),
                        postedFrom: postedFrom,
                        postedTo: postedTo
                    });
                    const url = `${API_BASE_URL}?${params.toString()}&api_key=${SAM_KEY}`;
                    const response = await makeHttpsRequest(url);
                    const data = JSON.parse(response);
                    if (data.opportunitiesData && data.opportunitiesData.length > 0) {
                        allContracts = allContracts.concat(data.opportunitiesData);
                        offset += limit;
                        output.appendLine(`[VALINOR DEBUG] Retrieved ${data.opportunitiesData.length} contracts (total: ${allContracts.length})`);
                        // Stop if we've got all contracts or if we've reached a reasonable limit
                        if (data.opportunitiesData.length < limit || allContracts.length >= 5000) {
                            hasMore = false;
                        }
                    }
                    else {
                        hasMore = false;
                    }
                }
                if (allContracts.length > 0) {
                    output.appendLine(`[VALINOR DEBUG] Total contracts retrieved: ${allContracts.length}, searching for exact match...`);
                    // Search through all contracts for exact solicitation number match
                    for (const contract of allContracts) {
                        if (contract.solicitationNumber === pattern) {
                            output.appendLine(`[VALINOR SUCCESS] Found EXACT match for solicitation number: ${pattern}`);
                            output.appendLine(`[VALINOR INFO] Title: ${contract.title || 'N/A'}`);
                            output.appendLine(`[VALINOR INFO] Agency: ${contract.fullParentPathName || 'N/A'}`);
                            output.appendLine(`[VALINOR INFO] Posted: ${contract.postedDate || 'N/A'}`);
                            output.appendLine(`[VALINOR INFO] Deadline: ${contract.responseDeadLine || 'N/A'}`);
                            output.appendLine(`[VALINOR INFO] API Notice ID: ${contract.noticeId || 'N/A'}`);
                            output.appendLine(`[VALINOR INFO] Solicitation Number: ${contract.solicitationNumber || 'N/A'}`);
                            return safeSerialize(contract);
                        }
                    }
                    // If no exact match, try partial matches
                    for (const contract of allContracts) {
                        if (contract.solicitationNumber && contract.solicitationNumber.includes(pattern)) {
                            output.appendLine(`[VALINOR SUCCESS] Found PARTIAL match for solicitation number: ${pattern}`);
                            output.appendLine(`[VALINOR INFO] Title: ${contract.title || 'N/A'}`);
                            output.appendLine(`[VALINOR INFO] Agency: ${contract.fullParentPathName || 'N/A'}`);
                            output.appendLine(`[VALINOR INFO] Posted: ${contract.postedDate || 'N/A'}`);
                            output.appendLine(`[VALINOR INFO] Deadline: ${contract.responseDeadLine || 'N/A'}`);
                            output.appendLine(`[VALINOR INFO] API Notice ID: ${contract.noticeId || 'N/A'}`);
                            output.appendLine(`[VALINOR INFO] Solicitation Number: ${contract.solicitationNumber || 'N/A'}`);
                            output.appendLine(`[VALINOR WARNING] This is a partial match - please verify this is the correct contract`);
                            return safeSerialize(contract);
                        }
                    }
                    output.appendLine(`[VALINOR ERROR] No matching contracts found for solicitation number: ${pattern}`);
                    output.appendLine(`[VALINOR DEBUG] Sample solicitation numbers in results: ${allContracts.slice(0, 10).map((c) => c.solicitationNumber).join(', ')}`);
                }
            }
            catch (error) {
                output.appendLine(`[VALINOR ERROR] Solicitation number search failed for pattern ${pattern}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }
    }
    // Strategy 3: Search around the specific published date (for contracts like FA527025R0012)
    try {
        output.appendLine(`[VALINOR DEBUG] Trying search around specific published date`);
        // For contracts published on specific dates, search a narrow window around that date
        const specificDates = [
            // July 2025 (when FA527025R0012 was published)
            { start: '07/01/2025', end: '07/31/2025', label: 'July 2025' },
            // June 2025
            { start: '06/01/2025', end: '06/30/2025', label: 'June 2025' },
            // August 2025
            { start: '08/01/2025', end: '08/31/2025', label: 'August 2025' }
        ];
        for (const dateRange of specificDates) {
            output.appendLine(`[VALINOR DEBUG] Searching ${dateRange.label}: ${dateRange.start} to ${dateRange.end}`);
            // Use pagination to get all contracts in this date range
            let allContractsInRange = [];
            let offset = 0;
            const limit = 1000;
            let hasMore = true;
            while (hasMore) {
                const params = new URLSearchParams({
                    limit: limit.toString(),
                    offset: offset.toString(),
                    postedFrom: dateRange.start,
                    postedTo: dateRange.end
                });
                const url = `${API_BASE_URL}?${params.toString()}&api_key=${SAM_KEY}`;
                const response = await makeHttpsRequest(url);
                const data = JSON.parse(response);
                if (data.opportunitiesData && data.opportunitiesData.length > 0) {
                    allContractsInRange = allContractsInRange.concat(data.opportunitiesData);
                    offset += limit;
                    output.appendLine(`[VALINOR DEBUG] Retrieved ${data.opportunitiesData.length} contracts in ${dateRange.label} (total: ${allContractsInRange.length})`);
                    // Stop if we've got all contracts or if we've reached a reasonable limit
                    if (data.opportunitiesData.length < limit || allContractsInRange.length >= 3000) {
                        hasMore = false;
                    }
                }
                else {
                    hasMore = false;
                }
            }
            if (allContractsInRange.length > 0) {
                output.appendLine(`[VALINOR DEBUG] Total contracts in ${dateRange.label}: ${allContractsInRange.length}`);
                // Search through all opportunities for exact pattern matches
                for (const contract of allContractsInRange) {
                    for (const pattern of analysis.patterns) {
                        if (contract.solicitationNumber === pattern ||
                            contract.noticeId === pattern) {
                            output.appendLine(`[VALINOR SUCCESS] Found contract with exact pattern match: ${pattern}`);
                            output.appendLine(`[VALINOR INFO] Title: ${contract.title || 'N/A'}`);
                            output.appendLine(`[VALINOR INFO] Agency: ${contract.fullParentPathName || 'N/A'}`);
                            output.appendLine(`[VALINOR INFO] Posted: ${contract.postedDate || 'N/A'}`);
                            output.appendLine(`[VALINOR INFO] Deadline: ${contract.responseDeadLine || 'N/A'}`);
                            output.appendLine(`[VALINOR INFO] API Notice ID: ${contract.noticeId || 'N/A'}`);
                            output.appendLine(`[VALINOR INFO] Solicitation Number: ${contract.solicitationNumber || 'N/A'}`);
                            return safeSerialize(contract);
                        }
                    }
                }
                output.appendLine(`[VALINOR DEBUG] No exact matches found in ${dateRange.label}`);
                output.appendLine(`[VALINOR DEBUG] Sample solicitation numbers: ${allContractsInRange.slice(0, 5).map((c) => c.solicitationNumber).join(', ')}`);
            }
        }
    }
    catch (error) {
        output.appendLine(`[VALINOR ERROR] Specific date search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    // Strategy 4: Fallback search with broader date range
    try {
        output.appendLine(`[VALINOR DEBUG] Trying fallback search with broader date range`);
        // Use a much broader date range (1 year back to 1 year forward)
        const broadStartDate = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000); // 1 year back
        const broadEndDate = new Date(today.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year forward
        const broadPostedFrom = formatDateForSAM(broadStartDate);
        const broadPostedTo = formatDateForSAM(broadEndDate);
        output.appendLine(`[VALINOR DEBUG] Broad date range: ${broadPostedFrom} to ${broadPostedTo}`);
        const params = new URLSearchParams({
            limit: '2000',
            postedFrom: broadPostedFrom,
            postedTo: broadPostedTo
        });
        const url = `${API_BASE_URL}?${params.toString()}&api_key=${SAM_KEY}`;
        const response = await makeHttpsRequest(url);
        const data = JSON.parse(response);
        if (data.opportunitiesData && data.opportunitiesData.length > 0) {
            output.appendLine(`[VALINOR DEBUG] Found ${data.opportunitiesData.length} opportunities in broad range`);
            // Search through all opportunities for exact pattern matches
            for (const contract of data.opportunitiesData) {
                for (const pattern of analysis.patterns) {
                    if (contract.solicitationNumber === pattern ||
                        contract.noticeId === pattern) {
                        output.appendLine(`[VALINOR SUCCESS] Found contract with exact pattern match: ${pattern}`);
                        output.appendLine(`[VALINOR INFO] Title: ${contract.title || 'N/A'}`);
                        output.appendLine(`[VALINOR INFO] Agency: ${contract.fullParentPathName || 'N/A'}`);
                        output.appendLine(`[VALINOR INFO] Posted: ${contract.postedDate || 'N/A'}`);
                        output.appendLine(`[VALINOR INFO] Deadline: ${contract.responseDeadLine || 'N/A'}`);
                        output.appendLine(`[VALINOR INFO] API Notice ID: ${contract.noticeId || 'N/A'}`);
                        output.appendLine(`[VALINOR INFO] Solicitation Number: ${contract.solicitationNumber || 'N/A'}`);
                        return safeSerialize(contract);
                    }
                }
            }
            output.appendLine(`[VALINOR DEBUG] No exact matches found in broad range`);
            output.appendLine(`[VALINOR DEBUG] Sample solicitation numbers: ${data.opportunitiesData.slice(0, 10).map((c) => c.solicitationNumber).join(', ')}`);
        }
    }
    catch (error) {
        output.appendLine(`[VALINOR ERROR] Fallback search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    output.appendLine(`[VALINOR ERROR] No contract found for Notice ID: ${noticeId}`);
    output.appendLine(`[VALINOR INFO] This may be due to:`);
    output.appendLine(`[VALINOR INFO]   - Contract not being in the API yet`);
    output.appendLine(`[VALINOR INFO]   - Date range limitations`);
    output.appendLine(`[VALINOR INFO]   - API availability issues`);
    output.appendLine(`[VALINOR INFO]   - Search parameter issues`);
    return null;
}
exports.searchSAMGovAPI = searchSAMGovAPI;
//# sourceMappingURL=sam-api.js.map