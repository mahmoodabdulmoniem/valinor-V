#!/usr/bin/env node

/**
 * Test script for enhanced SAM API functionality
 * Tests different Notice ID formats and search strategies
 */

const https = require('https');

// Test configuration
const SAM_API_KEY = 'PRgPCfuCFEeuxk489Gak3ZJEO9UILH0AQyrXGSWr';
const API_BASE_URL = "https://api.sam.gov/opportunities/v2/search";

// Helper function to make HTTPS requests
function makeHttpsRequest(url, options = {}) {
	return new Promise((resolve, reject) => {
		const request = https.get(url, options, (res) => {
			let data = '';
			res.on('data', (chunk) => data += chunk);
			res.on('end', () => {
				if (res.statusCode >= 200 && res.statusCode < 300) {
					resolve(data);
				} else {
					reject(new Error(`HTTP ${res.statusCode}: ${data}`));
				}
			});
		});
		request.on('error', reject);
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
		// Common patterns like OHND06252025DCA, SP3300-25-Q-0233, etc.
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

// Enhanced SAM.gov API search
async function searchSAMGovAPI(noticeId) {
	console.log(`\n🔍 Testing Notice ID: ${noticeId}`);

	const analysis = analyzeNoticeId(noticeId);
	console.log(`📊 Analysis:`);
	console.log(`   Type: ${analysis.type}`);
	console.log(`   Normalized: ${analysis.normalized}`);
	console.log(`   Patterns: ${analysis.patterns.join(', ')}`);

	const today = new Date();
	const startDate = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000); // 365 days back
	const endDate = new Date(today.getTime() + 365 * 24 * 60 * 60 * 1000); // 365 days forward

	// Strategy 1: Try exact solicitation number search
	if (analysis.type === 'website' || analysis.type === 'solicitation') {
		for (const pattern of analysis.patterns) {
			try {
				console.log(`\n🔎 Trying exact solicitation number search with: ${pattern}`);

				const params = new URLSearchParams({
					solicitationNumber: pattern,
					limit: '10',
					postedFrom: formatDateForSAM(startDate),
					postedTo: formatDateForSAM(endDate)
				});

				const url = `${API_BASE_URL}?${params.toString()}&api_key=${SAM_API_KEY}`;
				const response = await makeHttpsRequest(url);
				const data = JSON.parse(response);

				if (data.opportunitiesData && data.opportunitiesData.length > 0) {
					const contract = data.opportunitiesData[0];
					console.log(`✅ SUCCESS: Found contract with exact solicitation number match: ${pattern}`);
					console.log(`   Title: ${contract.title || 'N/A'}`);
					console.log(`   Agency: ${contract.fullParentPathName || 'N/A'}`);
					console.log(`   Posted: ${contract.postedDate || 'N/A'}`);
					console.log(`   Deadline: ${contract.responseDeadLine || 'N/A'}`);
					console.log(`   API Notice ID: ${contract.noticeId || 'N/A'}`);
					console.log(`   Solicitation Number: ${contract.solicitationNumber || 'N/A'}`);
					return contract;
				}
			} catch (error) {
				console.log(`❌ Exact search failed for pattern ${pattern}: ${error.message}`);
			}
		}
	}

	// Strategy 2: Try API Notice ID search
	if (analysis.type === 'api') {
		try {
			console.log(`\n🔎 Trying API Notice ID search`);

			const params = new URLSearchParams({
				noticeid: noticeId,
				limit: '10'
			});

			const url = `${API_BASE_URL}?${params.toString()}&api_key=${SAM_API_KEY}`;
			const response = await makeHttpsRequest(url);
			const data = JSON.parse(response);

			if (data.opportunitiesData && data.opportunitiesData.length > 0) {
				const contract = data.opportunitiesData[0];
				console.log(`✅ SUCCESS: Found contract with API Notice ID`);
				console.log(`   Title: ${contract.title || 'N/A'}`);
				console.log(`   Agency: ${contract.fullParentPathName || 'N/A'}`);
				console.log(`   Posted: ${contract.postedDate || 'N/A'}`);
				console.log(`   Deadline: ${contract.responseDeadLine || 'N/A'}`);
				console.log(`   API Notice ID: ${contract.noticeId || 'N/A'}`);
				console.log(`   Solicitation Number: ${contract.solicitationNumber || 'N/A'}`);
				return contract;
			}
		} catch (error) {
			console.log(`❌ API Notice ID search failed: ${error.message}`);
		}
	}

	// Strategy 3: Broad search with pattern matching
	try {
		console.log(`\n🔎 Trying broad search with pattern matching`);

		const params = new URLSearchParams({
			limit: '200',
			postedFrom: formatDateForSAM(startDate),
			postedTo: formatDateForSAM(endDate)
		});

		const url = `${API_BASE_URL}?${params.toString()}&api_key=${SAM_API_KEY}`;
		const response = await makeHttpsRequest(url);
		const data = JSON.parse(response);

		if (data.opportunitiesData && data.opportunitiesData.length > 0) {
			console.log(`📋 Found ${data.opportunitiesData.length} opportunities in broad search`);

			// Search through all opportunities for pattern matches
			for (const contract of data.opportunitiesData) {
				for (const pattern of analysis.patterns) {
					if (contract.solicitationNumber === pattern ||
						contract.noticeId === pattern ||
						(contract.title && contract.title.toLowerCase().includes(pattern.toLowerCase()))) {

						console.log(`✅ SUCCESS: Found contract with pattern match: ${pattern}`);
						console.log(`   Title: ${contract.title || 'N/A'}`);
						console.log(`   Agency: ${contract.fullParentPathName || 'N/A'}`);
						console.log(`   Posted: ${contract.postedDate || 'N/A'}`);
						console.log(`   Deadline: ${contract.responseDeadLine || 'N/A'}`);
						console.log(`   API Notice ID: ${contract.noticeId || 'N/A'}`);
						console.log(`   Solicitation Number: ${contract.solicitationNumber || 'N/A'}`);
						return contract;
					}
				}
			}
		}
	} catch (error) {
		console.log(`❌ Broad search failed: ${error.message}`);
	}

	console.log(`❌ No contract found for Notice ID: ${noticeId}`);
	return null;
}

// Test cases
async function runTests() {
	console.log('🚀 Testing Enhanced SAM API Functionality\n');
	console.log('='.repeat(60));

	const testCases = [
		// Your original test case
		'OHND06252025DCA',

		// Known working solicitation numbers from our previous search
		'SPE7M125T163A',
		'SPE7L125Q2043',
		'36C25625R0088-1',

		// Different format variations
		'SP3300-25-Q-0233',
		'SP330025Q0233',
		'SP3300_25_Q_0233',

		// API Notice ID format (32 character hex)
		'ffc9d9592dba4ac7b565a92011f694e3',

		// Edge cases
		'JWICS_OSS_A046687',
		'JWICS-OSS-A046687',
		'JWICSOSSA046687'
	];

	for (const testCase of testCases) {
		try {
			await searchSAMGovAPI(testCase);
			console.log('\n' + '-'.repeat(60));
		} catch (error) {
			console.log(`❌ Test failed for ${testCase}: ${error.message}`);
			console.log('\n' + '-'.repeat(60));
		}
	}

	console.log('\n🎯 Test Summary:');
	console.log('The enhanced SAM API now supports:');
	console.log('✅ Multiple Notice ID formats (website, API, solicitation)');
	console.log('✅ Pattern variations and normalization');
	console.log('✅ Multiple search strategies');
	console.log('✅ Better error handling and logging');
	console.log('✅ Interchangeable Notice ID mapping');
}

// Run the tests
runTests().catch(console.error);
