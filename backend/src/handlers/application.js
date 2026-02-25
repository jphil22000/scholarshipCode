import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, PutCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb'

const dynamoClient = new DynamoDBClient({})
const docClient = DynamoDBDocumentClient.from(dynamoClient)

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS'
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
    const { id } = event.pathParameters || {}
    const tableName = process.env.APPLICATIONS_TABLE

    if (!id) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Application ID is required' })
      }
    }

    if (event.httpMethod === 'PUT') {
      // Update application
      const body = JSON.parse(event.body || '{}')
      
      // Get existing application
      const getCommand = new GetCommand({
        TableName: tableName,
        Key: { id }
      })

      const existing = await docClient.send(getCommand)

      if (!existing.Item) {
        return {
          statusCode: 404,
          headers: CORS_HEADERS,
          body: JSON.stringify({ error: 'Application not found' })
        }
      }

      const updated = {
        ...existing.Item,
        ...body,
        id, // Ensure ID doesn't change
        updatedAt: new Date().toISOString()
      }

      const putCommand = new PutCommand({
        TableName: tableName,
        Item: updated
      })

      await docClient.send(putCommand)

      return {
        statusCode: 200,
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updated)
      }
    }

    if (event.httpMethod === 'DELETE') {
      // Delete application
      const deleteCommand = new DeleteCommand({
        TableName: tableName,
        Key: { id }
      })

      await docClient.send(deleteCommand)

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: 'Application deleted successfully' })
      }
    }

    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Error handling application:', error)
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
