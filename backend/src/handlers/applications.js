import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, ScanCommand, PutCommand } from '@aws-sdk/lib-dynamodb'

const dynamoClient = new DynamoDBClient({})
const docClient = DynamoDBDocumentClient.from(dynamoClient)

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: ''
    }
  }

  try {
    const tableName = process.env.APPLICATIONS_TABLE

    if (event.httpMethod === 'GET') {
      // Get all applications
      const command = new ScanCommand({
        TableName: tableName
      })

      const result = await docClient.send(command)
      
      return {
        statusCode: 200,
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(result.Items || [])
      }
    }

    if (event.httpMethod === 'POST') {
      // Create new application
      const body = JSON.parse(event.body || '{}')
      
      const application = {
        id: `app-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ...body,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      const command = new PutCommand({
        TableName: tableName,
        Item: application
      })

      await docClient.send(command)

      return {
        statusCode: 201,
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(application)
      }
    }

    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Error handling applications:', error)
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error: 'Failed to process request',
        message: error.message
      })
    }
  }
}
