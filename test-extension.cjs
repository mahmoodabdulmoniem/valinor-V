const https = require('https');

// Test the exact same logic as the extension
const SAM_KEY = process.env.SAM_API_KEY || 'PRgPCfuCFEeuxk489Gak3ZJEO9UILH0AQyrXGSWr';
const API_BASE_URL = "https://api.sam.gov/opportunities/v2/search";

function makeHttpsRequest(url) {
	return new Promise((resolve, reject) => {
		const request = https.get(url, (res) => {
			let data = '';
			res.on('data', (chunk) => data += chunk);
			res.on('end', () => {
				if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
					resolve(data);
				} else {
					reject(new Error(`HTTP ${res.statusCode}: ${data}`));
				}
			});
		});
		request.on('error', (error) => {
			reject(new Error(error.message || 'Request failed'));
		});
		request.setTimeout(30000, () => {
			request.destroy();
			reject(new Error('Request timeout'));
		});
	});
}

function formatDateForSAM(date) {
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	const year = date.getFullYear();
	return `${month}/${day}/${year}`;
}

async function testExtensionLogic(noticeId) {
	console.log(`\n🔍 Testing extension logic for: ${noticeId}`);

	// Set up date range (same as extension)
	const today = new Date();
	const startDate = new Date(today.getTime() - 180 * 24 * 60 * 60 * 1000); // 180 days back
	const endDate = new Date(today.getTime() + 180 * 24 * 60 * 60 * 1000); // 180 days forward
	const postedFrom = formatDateForSAM(startDate);
	const postedTo = formatDateForSAM(endDate);

	console.log(`📅 Date range: ${postedFrom} to ${postedTo}`);

	try {
		// Strategy 2: Solicitation number search with pagination (same as extension)
		console.log('\n📡 Testing solicitation number search with pagination...');

		// Use pagination to get all contracts
		let allContracts = [];
		let offset = 0;
		const limit = 1000;
		let hasMore = true;

		while (hasMore) {
			const params = new URLSearchParams({
				limit: limit.toString(),
				offset: offset.toString(),
				postedFrom: postedFrom,
				postedTo: postedTo
			});

			const url = `${API_BASE_URL}?${params.toString()}&api_key=${SAM_KEY}`;
			console.log(`🌐 URL: ${url}`);

			const response = await makeHttpsRequest(url);
			const data = JSON.parse(response);

			if (data.opportunitiesData && data.opportunitiesData.length > 0) {
				allContracts = allContracts.concat(data.opportunitiesData);
				offset += limit;

				console.log(`📊 Retrieved ${data.opportunitiesData.length} contracts (total: ${allContracts.length})`);

				// Check if we found our contract in this batch
				for (const contract of data.opportunitiesData) {
					if (contract.solicitationNumber === noticeId) {
						console.log(`✅ Found EXACT match for solicitation number: ${noticeId}`);
						console.log(`📋 Contract Details:`);
						console.log(`   Title: ${contract.title || 'N/A'}`);
						console.log(`   Agency: ${contract.fullParentPathName || 'N/A'}`);
						console.log(`   Posted: ${contract.postedDate || 'N/A'}`);
						console.log(`   Deadline: ${contract.responseDeadLine || 'N/A'}`);
						console.log(`   API Notice ID: ${contract.noticeId || 'N/A'}`);
						console.log(`   Solicitation Number: ${contract.solicitationNumber || 'N/A'}`);
						return contract;
					}
				}

				// Stop if we've got all contracts or if we've reached a reasonable limit
				if (data.opportunitiesData.length < limit || allContracts.length >= 10000) {
					hasMore = false;
				}
			} else {
				hasMore = false;
			}
		}

		console.log(`\n📋 Total contracts retrieved: ${allContracts.length}`);

		if (allContracts.length > 0) {
			// Final search through all contracts
			let found = false;
			for (const contract of allContracts) {
				if (contract.solicitationNumber === noticeId) {
					console.log(`✅ Found EXACT match for solicitation number: ${noticeId}`);
					console.log(`📋 Contract Details:`);
					console.log(`   Title: ${contract.title || 'N/A'}`);
					console.log(`   Agency: ${contract.fullParentPathName || 'N/A'}`);
					console.log(`   Posted: ${contract.postedDate || 'N/A'}`);
					console.log(`   Deadline: ${contract.responseDeadLine || 'N/A'}`);
					console.log(`   API Notice ID: ${contract.noticeId || 'N/A'}`);
					console.log(`   Solicitation Number: ${contract.solicitationNumber || 'N/A'}`);
					found = true;
					return contract;
				}
			}

			if (!found) {
				console.log(`❌ No exact match found`);
				console.log(`📋 Sample solicitation numbers:`);
				allContracts.slice(0, 10).forEach((contract, i) => {
					console.log(`   ${i + 1}. ${contract.solicitationNumber || 'N/A'} - ${contract.title || 'N/A'}`);
				});
			}
		}

	} catch (error) {
		console.error(`❌ Error: ${error.message}`);
	}

	console.log('\n❌ Contract not found');
}

// Test with the contract
const noticeId = process.argv[2] || 'FA527025R0012';
testExtensionLogic(noticeId).then(() => {
	console.log('\n✅ Test completed!');
}).catch(error => {
	console.error('\n💥 ERROR:', error.message);
});
