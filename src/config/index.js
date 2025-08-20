// Main configuration exports
module.exports = {
  DatabaseManager: require('./database'),
  MySQLConfig: require('./database/mysql'),
  MongoDBConfig: require('./mongodb/mongodb'),
  RedisConfig: require('./redis/redis'),
  Neo4jConfig: require('./neo4j/neo4j'),
  EnvironmentConfig: require('./environment')
};
