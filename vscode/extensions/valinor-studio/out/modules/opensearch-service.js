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
exports.OpenSearchService = void 0;
const vscode = __importStar(require("vscode"));
class OpenSearchService {
    constructor(output) {
        this.output = output;
        this.config = this.getConfig();
    }
    getConfig() {
        const config = vscode.workspace.getConfiguration('valinorStudio');
        return {
            endpoint: config.get('opensearchEndpoint') || '',
            username: config.get('opensearchUsername') || '',
            password: config.get('opensearchPassword') || ''
        };
    }
    logToTerminal(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const colors = {
            info: '\x1b[36m',
            debug: '\x1b[35m',
            warning: '\x1b[33m',
            error: '\x1b[31m',
            success: '\x1b[32m' // Green
        };
        const banner = `
    ╔══════════════════════════════════════════════════════════════════════════════╗
    ║                                VALINOR STUDIO                                ║
    ║                              OpenSearch Service                              ║
    ╚══════════════════════════════════════════════════════════════════════════════╝
    `;
        const color = colors[type];
        const reset = '\x1b[0m';
        const logMessage = `${banner}${color}[${timestamp}] [${type.toUpperCase()}] ${message}${reset}`;
        console.log(logMessage);
        this.output.appendLine(`[${timestamp}] [${type.toUpperCase()}] ${message}`);
    }
    async searchContractByNoticeId(noticeId) {
        this.logToTerminal(`🔍 Searching OpenSearch for Notice ID: ${noticeId}`, 'info');
        try {
            // First, try exact match search
            const exactResult = await this.exactSearch(noticeId);
            if (exactResult) {
                this.logToTerminal(`✅ Found contract with exact match: ${noticeId}`, 'success');
                return exactResult;
            }
            // If no exact match, try fuzzy search
            this.logToTerminal(`🔍 No exact match found, trying fuzzy search for: ${noticeId}`, 'debug');
            const fuzzyResult = await this.fuzzySearch(noticeId);
            if (fuzzyResult) {
                this.logToTerminal(`✅ Found contract with fuzzy match: ${noticeId}`, 'success');
                return fuzzyResult;
            }
            // If still no match, try solicitation number search
            this.logToTerminal(`🔍 No fuzzy match found, trying solicitation number search for: ${noticeId}`, 'debug');
            const solicitationResult = await this.solicitationNumberSearch(noticeId);
            if (solicitationResult) {
                this.logToTerminal(`✅ Found contract with solicitation number match: ${noticeId}`, 'success');
                return solicitationResult;
            }
            this.logToTerminal(`❌ No contract found in OpenSearch for Notice ID: ${noticeId}`, 'error');
            return null;
        }
        catch (error) {
            this.logToTerminal(`❌ Error searching OpenSearch: ${error}`, 'error');
            throw error;
        }
    }
    async exactSearch(noticeId) {
        const query = {
            query: {
                bool: {
                    must: [
                        {
                            term: {
                                noticeId: noticeId
                            }
                        }
                    ]
                }
            },
            size: 1
        };
        return await this.executeSearch(query, 'exact match');
    }
    async fuzzySearch(noticeId) {
        const query = {
            query: {
                bool: {
                    should: [
                        {
                            match: {
                                noticeId: {
                                    query: noticeId,
                                    fuzziness: "AUTO"
                                }
                            }
                        },
                        {
                            match: {
                                title: {
                                    query: noticeId,
                                    fuzziness: "AUTO"
                                }
                            }
                        },
                        {
                            match: {
                                fullText: {
                                    query: noticeId,
                                    fuzziness: "AUTO"
                                }
                            }
                        }
                    ],
                    minimum_should_match: 1
                }
            },
            size: 10
        };
        return await this.executeSearch(query, 'fuzzy search');
    }
    async solicitationNumberSearch(noticeId) {
        // Try to find contracts where the solicitation number matches
        const query = {
            query: {
                bool: {
                    should: [
                        {
                            match: {
                                solicitationNumber: {
                                    query: noticeId,
                                    fuzziness: "AUTO"
                                }
                            }
                        },
                        {
                            match: {
                                fullText: {
                                    query: noticeId,
                                    fuzziness: "AUTO"
                                }
                            }
                        }
                    ],
                    minimum_should_match: 1
                }
            },
            size: 10
        };
        return await this.executeSearch(query, 'solicitation number search');
    }
    async executeSearch(query, searchType) {
        try {
            this.logToTerminal(`🔍 Executing ${searchType} query...`, 'debug');
            const response = await fetch(`${this.config.endpoint}/contracts/_search`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64')}`
                },
                body: JSON.stringify(query)
            });
            if (!response.ok) {
                throw new Error(`OpenSearch request failed: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            this.logToTerminal(`📊 ${searchType} returned ${data.hits?.total?.value || 0} results`, 'debug');
            if (data.hits?.hits?.length > 0) {
                const hit = data.hits.hits[0];
                const source = hit._source;
                return {
                    noticeId: source.noticeId || source.notice_id || '',
                    title: source.title || source.solicitationTitle || '',
                    description: source.description || source.solicitationDescription || '',
                    postedDate: source.postedDate || source.posted_date || source.publishedDate || '',
                    responseDate: source.responseDate || source.response_date || source.dueDate || '',
                    agency: source.agency || source.contractingOffice || '',
                    classificationCode: source.classificationCode || source.classification_code || '',
                    setAside: source.setAside || source.set_aside || '',
                    naicsCode: source.naicsCode || source.naics_code || '',
                    pointOfContact: source.pointOfContact || source.point_of_contact || '',
                    fullText: source.fullText || source.full_text || source.description || ''
                };
            }
            return null;
        }
        catch (error) {
            this.logToTerminal(`❌ Error in ${searchType}: ${error}`, 'error');
            throw error;
        }
    }
    async searchContractsByDateRange(startDate, endDate, limit = 1000) {
        this.logToTerminal(`🔍 Searching contracts from ${startDate} to ${endDate}`, 'info');
        try {
            const query = {
                query: {
                    range: {
                        postedDate: {
                            gte: startDate,
                            lte: endDate
                        }
                    }
                },
                size: limit,
                sort: [
                    {
                        postedDate: {
                            order: "desc"
                        }
                    }
                ]
            };
            const response = await fetch(`${this.config.endpoint}/contracts/_search`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64')}`
                },
                body: JSON.stringify(query)
            });
            if (!response.ok) {
                throw new Error(`OpenSearch request failed: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            const results = [];
            if (data.hits?.hits) {
                for (const hit of data.hits.hits) {
                    const source = hit._source;
                    results.push({
                        noticeId: source.noticeId || source.notice_id || '',
                        title: source.title || source.solicitationTitle || '',
                        description: source.description || source.solicitationDescription || '',
                        postedDate: source.postedDate || source.posted_date || source.publishedDate || '',
                        responseDate: source.responseDate || source.response_date || source.dueDate || '',
                        agency: source.agency || source.contractingOffice || '',
                        classificationCode: source.classificationCode || source.classification_code || '',
                        setAside: source.setAside || source.set_aside || '',
                        naicsCode: source.naicsCode || source.naics_code || '',
                        pointOfContact: source.pointOfContact || source.point_of_contact || '',
                        fullText: source.fullText || source.full_text || source.description || ''
                    });
                }
            }
            this.logToTerminal(`✅ Found ${results.length} contracts in date range`, 'success');
            return results;
        }
        catch (error) {
            this.logToTerminal(`❌ Error searching by date range: ${error}`, 'error');
            throw error;
        }
    }
    async testConnection() {
        try {
            this.logToTerminal(`🔍 Testing OpenSearch connection to: ${this.config.endpoint}`, 'info');
            const response = await fetch(`${this.config.endpoint}/_cluster/health`, {
                method: 'GET',
                headers: {
                    'Authorization': `Basic ${Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64')}`
                }
            });
            if (!response.ok) {
                throw new Error(`Connection test failed: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            this.logToTerminal(`✅ OpenSearch connection successful. Cluster status: ${data.status}`, 'success');
            return true;
        }
        catch (error) {
            this.logToTerminal(`❌ OpenSearch connection failed: ${error}`, 'error');
            return false;
        }
    }
}
exports.OpenSearchService = OpenSearchService;
//# sourceMappingURL=opensearch-service.js.map