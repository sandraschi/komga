const weaviate = require('weaviate-client');

async function testWeaviateConnection() {
  try {
    // Connect to the Weaviate server
    const client = await weaviate.client({
      scheme: 'http',
      host: 'localhost:8080',
    });

    console.log('Testing Weaviate connection...');
    
    // Check if Weaviate is ready
    const isReady = await client.misc.readyChecker().do();
    console.log('Weaviate is ready:', isReady);
    
    // Get Weaviate server meta information
    const meta = await client.misc.metaGetter().do();
    console.log('Weaviate version:', meta.version);
    
    // List all schemas/collections
    const schemas = await client.schema.getter().do();
    console.log('\nExisting schemas:', schemas.classes ? schemas.classes.length : 0);
    
    if (schemas.classes && schemas.classes.length > 0) {
      console.log('Schema names:');
      schemas.classes.forEach(schema => console.log(`- ${schema.class}`));
    }
    
  } catch (error) {
    console.error('Error connecting to Weaviate:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

testWeaviateConnection();
