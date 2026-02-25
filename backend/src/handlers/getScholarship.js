import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS'
}

const tableName = process.env.SCHOLARSHIPS_TABLE
const client = new DynamoDBClient({})
const doc = DynamoDBDocumentClient.from(client)

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: '' }
  }

  try {
    const { id } = event.pathParameters || {}

    if (!id) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Scholarship ID is required' })
      }
    }

    if (!tableName) {
      return {
        statusCode: 503,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Scholarships table not configured' })
      }
    }

    const res = await doc.send(
      new GetCommand({
        TableName: tableName,
        Key: { id }
      })
    )

    if (!res.Item) {
      return {
        statusCode: 404,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Scholarship not found' })
      }
    }

    const scholarship = { ...res.Item }
    delete scholarship.updatedAt

    return {
      statusCode: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify(scholarship)
    }
  } catch (error) {
    console.error('Error getting scholarship:', error)
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error: 'Failed to get scholarship',
        message: error.message
      })
    }
  }
}
