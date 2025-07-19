# Live Pricing Validation Feature

## Overview

The Live Pricing Validation feature provides real-time validation of pricing against historical government contract data from SAM.gov and USAspending.gov. This feature helps ensure competitive and accurate pricing for government contract proposals by comparing submitted prices against historical averages, ranges, and trends.

## Features

### 🎯 Core Functionality
- **Real-time Validation**: Instant pricing validation against historical data
- **Multi-Source Data**: Integrates with SAM.gov and USAspending.gov APIs
- **Statistical Analysis**: Calculates averages, ranges, variance, and confidence levels
- **Visual Indicators**: Color-coded decorations and notifications for pricing status
- **Batch Processing**: Validate multiple pricing entries simultaneously
- **API Server**: Dedicated backend service for pricing validation requests

### 🔄 Workflow

1. **Price Detection**: Automatically detects pricing information in documents
2. **API Request**: Sends validation request to backend service
3. **Data Retrieval**: Fetches historical data from government APIs
4. **Analysis**: Calculates statistical measures and confidence levels
5. **Visual Feedback**: Applies decorations and shows notifications
6. **Detailed Reports**: Provides comprehensive validation reports

## API Endpoints

### GET /api/pricing/validate
Validates a single pricing entry against historical data.

**Parameters:**
- `item` (required): Item description or identifier
- `unit_price` (required): Unit price to validate
- `naics` (optional): NAICS code for more accurate matching

**Example Request:**
```
GET /api/pricing/validate?item=optic-fiber-28-count&unit_price=12.34&naics=517311
```

**Example Response:**
```json
{
  "submittedPrice": 12.34,
  "historicAvg": 10.27,
  "historicMin": 8.50,
  "historicMax": 15.60,
  "variance": "+20.18%",
  "variancePercent": 20.18,
  "isWithinRange": true,
  "confidence": "high",
  "sampleSize": 45,
  "lastUpdated": "2024-01-15T10:30:00Z",
  "sources": ["SAM.gov", "USAspending.gov"],
  "warnings": []
}
```

### POST /api/pricing/batch
Validates multiple pricing entries in a single request.

**Request Body:**
```json
[
  {
    "item": "optic-fiber-28-count",
    "unitPrice": 12.34,
    "naicsCode": "517311"
  },
  {
    "item": "software-license",
    "unitPrice": 1500.00,
    "naicsCode": "541511"
  }
]
```

**Response:**
```json
{
  "results": [
    {
      "submittedPrice": 12.34,
      "historicAvg": 10.27,
      "variance": "+20.18%",
      "isWithinRange": true,
      "confidence": "high"
    },
    {
      "submittedPrice": 1500.00,
      "historicAvg": 1200.00,
      "variance": "+25.00%",
      "isWithinRange": false,
      "confidence": "medium"
    }
  ]
}
```

### GET /api/pricing/health
Health check endpoint for the pricing validation service.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "services": {
    "sam": "configured",
    "usaspending": "configured"
  }
}
```

## Data Sources

### SAM.gov API
- **Endpoint**: `https://api.sam.gov/contracts/v1/contracts`
- **Data**: Contract awards, pricing, awardees, agencies
- **Fields**: awardee, baseAndAllOptionsValue, awardingAgency, naics, contractAwardDate
- **Authentication**: API key required

### USAspending.gov API
- **Endpoint**: `https://api.usaspending.gov/api/v2/search/spending_by_award`
- **Data**: Federal spending data, contract obligations
- **Fields**: award_id, total_obligation, recipient_name, awarding_agency_name
- **Authentication**: No API key required (public data)

## Statistical Analysis

### Metrics Calculated
- **Historic Average**: Mean price from historical data
- **Historic Range**: Minimum and maximum prices
- **Variance**: Percentage difference from average
- **Confidence Level**: Data quality assessment (high/medium/low)
- **Sample Size**: Number of historical contracts analyzed

### Confidence Levels
- **High**: 20+ historical contracts
- **Medium**: 10-19 historical contracts
- **Low**: <10 historical contracts

### Warning Thresholds
- **Range Warning**: Price outside historical min/max range
- **Variance Warning**: >50% variance from historical average
- **Overpricing Warning**: >100% variance (double the average)
- **Underpricing Warning**: <-50% variance (may be underpriced)

## VS Code Integration

### Commands
- `valinorStudio.validatePricing`: Validate pricing at cursor position
- `valinorStudio.validateAllPricing`: Validate all pricing in document

### Visual Indicators
- **Green Checkmark (✓)**: Price within acceptable range
- **Yellow Warning (⚠)**: Price has moderate variance
- **Red X (✗)**: Price significantly outside historical range

### Notifications
- Success messages for valid pricing
- Warning messages with "View Details" option
- Error messages for validation failures

### Detailed Reports
- WebView panel with comprehensive validation results
- Historical data visualization
- Confidence level indicators
- Warning explanations and recommendations

## Configuration

### Environment Variables
```bash
# Required for SAM.gov API access
SAM_API_KEY=your_sam_api_key_here

# Optional for enhanced USAspending.gov access
USASPENDING_API_KEY=your_usaspending_api_key_here
```

### API Server Configuration
- **Default Port**: 3002
- **Auto-increment**: If port is in use, automatically tries next port
- **CORS**: Enabled for cross-origin requests
- **Error Handling**: Comprehensive error responses with details

## Usage Examples

### Basic Validation
1. Open a document with pricing information
2. Position cursor on a price entry
3. Run command: `Valinor Studio: Validate Pricing at Cursor`
4. Review validation results in notification

### Batch Validation
1. Open a document with multiple pricing entries
2. Run command: `Valinor Studio: Validate All Pricing in Document`
3. Monitor progress in notification
4. Review all validation results

### API Integration
```javascript
// Example client-side validation
const response = await fetch('/api/pricing/validate?item=optic-fiber&unit_price=12.34');
const result = await response.json();

if (result.warnings && result.warnings.length > 0) {
  console.log('Pricing warnings:', result.warnings);
}
```

## NAICS Code Mapping

### Automatic Detection
The system automatically maps item descriptions to NAICS codes:

- **Telecommunications**: `517311` (Telecommunications Resellers)
- **Software/IT**: `541511` (Custom Computer Programming Services)
- **Construction**: `236220` (Commercial Building Construction)
- **Default**: `517311` (Telecommunications Resellers)

### Manual Override
Users can specify NAICS codes manually via the API:
```
GET /api/pricing/validate?item=software&unit_price=1500&naics=541511
```

## Error Handling

### Common Errors
- **API Key Missing**: SAM.gov API key not configured
- **Network Issues**: Connection problems with government APIs
- **No Data**: No historical data available for comparison
- **Invalid Parameters**: Missing or invalid request parameters

### Error Responses
```json
{
  "error": "Pricing validation failed",
  "details": "SAM.gov API key not configured"
}
```

## Performance Considerations

### Rate Limiting
- **SAM.gov**: Respects API rate limits
- **USAspending.gov**: Implements request throttling
- **Batch Processing**: 1-second delay between requests

### Caching
- **Session-based**: Caches results during active session
- **Temporary Files**: Automatic cleanup after 5 minutes
- **Memory Management**: Efficient resource cleanup

### Optimization
- **Parallel Requests**: Simultaneous API calls to multiple sources
- **Data Filtering**: Pre-filters relevant historical data
- **Statistical Sampling**: Uses representative data subsets

## Security

### API Key Management
- **Environment Variables**: Secure storage of API keys
- **No Hardcoding**: Keys never stored in source code
- **Access Control**: Keys only used for API requests

### Data Privacy
- **No Storage**: Validation results not permanently stored
- **Temporary Processing**: Data processed in memory only
- **Secure Transmission**: HTTPS for all API communications

## Troubleshooting

### Common Issues
1. **"SAM API key not configured"**
   - Solution: Set SAM_API_KEY environment variable

2. **"No historical data available"**
   - Solution: Check NAICS code mapping or try different item description

3. **"API server not responding"**
   - Solution: Check if pricing API server is running on port 3002

4. **"Network timeout"**
   - Solution: Check internet connection and government API status

### Debug Information
- Check VS Code Output panel for detailed logs
- Review API server logs for request/response details
- Verify environment variable configuration
- Test API endpoints directly with curl or Postman

## Future Enhancements

### Planned Features
- **Machine Learning**: AI-powered price prediction
- **Market Analysis**: Industry-specific pricing trends
- **Competitor Analysis**: Compare against competitor pricing
- **Historical Trends**: Time-series analysis of price changes
- **Custom Thresholds**: User-configurable warning levels

### Advanced Analytics
- **Price Forecasting**: Predict future price trends
- **Risk Assessment**: Evaluate pricing risk factors
- **Optimization Suggestions**: Recommend optimal pricing strategies
- **Market Intelligence**: Industry-specific insights

## API Documentation

### Request Format
All API requests should include proper headers:
```
Content-Type: application/json
User-Agent: Valinor-Studio/1.0
```

### Response Format
All responses include:
- **Status Code**: HTTP status code
- **Content-Type**: application/json
- **CORS Headers**: For cross-origin requests
- **Error Details**: Comprehensive error information

### Rate Limits
- **SAM.gov**: 1000 requests per hour
- **USAspending.gov**: 1000 requests per hour
- **Local API**: No limits (internal service)

This comprehensive pricing validation system ensures accurate, competitive pricing for government contract proposals while providing detailed insights and recommendations for optimal pricing strategies.
