#!/usr/bin/env python3
"""
Neo4j Integration Module for Regulatory Knowledge Graph

This module handles integration with Neo4j database for loading and querying
regulatory knowledge graph data.
"""

import os
import logging
from typing import List, Dict, Any
from neo4j import GraphDatabase, Driver, Session
from neo4j.exceptions import Neo4jError
import time

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class Neo4jIntegrator:
    """Integrates with Neo4j database for regulatory knowledge graph."""
    
    def __init__(self):
        # Get Neo4j connection details from environment variables
        self.uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
        self.user = os.getenv("NEO4J_USER", "neo4j")
        self.password = os.getenv("NEO4J_PASSWORD", "password")
        
        # Initialize driver
        self.driver = None
        self._connect()
    
    def _connect(self) -> None:
        """Establish connection to Neo4j database."""
        try:
            self.driver = GraphDatabase.driver(self.uri, auth=(self.user, self.password))
            # Test the connection
            with self.driver.session() as session:
                session.run("RETURN 1")
            logger.info("Successfully connected to Neo4j database")
        except Exception as e:
            logger.error(f"Failed to connect to Neo4j database: {e}")
            self.driver = None
    
    def load_data(self, cypher_queries: List[str]) -> bool:
        """
        Load Cypher queries into Neo4j database.
        
        Args:
            cypher_queries: List of Cypher queries to execute
            
        Returns:
            True if successful, False otherwise
        """
        if not self.driver:
            logger.error("No database connection available")
            return False
        
        try:
            with self.driver.session() as session:
                # Batch execution for better performance
                total_queries = len(cypher_queries)
                success_count = 0
                
                # Process in batches of 100 to avoid memory issues
                batch_size = 100
                for i in range(0, total_queries, batch_size):
                    batch = cypher_queries[i:i + batch_size]
                    result = self._execute_batch(session, batch)
                    success_count += result
                    
                    # Add a small delay between batches for large datasets
                    if i + batch_size < total_queries:
                        time.sleep(0.1)
                
                logger.info(f"Successfully executed {success_count}/{total_queries} Cypher queries")
                return success_count == total_queries
                
        except Exception as e:
            logger.error(f"Error while loading data into Neo4j: {e}")
            return False
    
    def _execute_batch(self, session: Session, queries: List[str]) -> int:
        """
        Execute a batch of Cypher queries.
        
        Args:
            session: Neo4j session
            queries: List of Cypher queries
            
        Returns:
            Number of successfully executed queries
        """
        success_count = 0
        
        # Execute each query in the batch
        for i, query in enumerate(queries):
            try:
                session.run(query)
                success_count += 1
                if i % 50 == 0:  # Log progress every 50 queries
                    logger.info(f"Executed query {i + 1}/{len(queries)}")
            except Exception as e:
                logger.error(f"Failed to execute query {i + 1}: {e}")
                logger.debug(f"Failed query: {query[:100]}...")
        
        return success_count
    
    def create_constraints(self) -> bool:
        """
        Create database constraints for data integrity.
        
        Returns:
            True if successful, False otherwise
        """
        if not self.driver:
            logger.error("No database connection available")
            return False
            
        constraints = [
            "CREATE CONSTRAINT constraint_regulation_name IF NOT EXISTS FOR (r:Regulation) REQUIRE r.name IS UNIQUE",
            "CREATE CONSTRAINT constraint_article_name IF NOT EXISTS FOR (a:Article) REQUIRE a.name IS UNIQUE",
            "CREATE CONSTRAINT constraint_region_name IF NOT EXISTS FOR (r:Region) REQUIRE r.name IS UNIQUE",
            "CREATE CONSTRAINT constraint_jurisdiction_name IF NOT EXISTS FOR (j:Jurisdiction) REQUIRE j.name IS UNIQUE"
        ]
        
        try:
            with self.driver.session() as session:
                for constraint in constraints:
                    session.run(constraint)
            logger.info("Successfully created constraints")
            return True
        except Exception as e:
            logger.error(f"Error creating constraints: {e}")
            return False
    
    def get_regulation_count(self) -> int:
        """
        Get the count of regulations in the database.
        
        Returns:
            Number of regulations
        """
        if not self.driver:
            logger.error("No database connection available")
            return 0
            
        try:
            with self.driver.session() as session:
                result = session.run("MATCH (r:Regulation) RETURN count(r) as count")
                return result.single()["count"]
        except Exception as e:
            logger.error(f"Error getting regulation count: {e}")
            return 0
    
    def get_all_regulations(self, limit: int = 100) -> List[Dict[str, Any]]:
        """
        Get a list of all regulations from the database.
        
        Args:
            limit: Maximum number of regulations to return
            
        Returns:
            List of regulations with their properties
        """
        if not self.driver:
            logger.error("No database connection available")
            return []
            
        try:
            with self.driver.session() as session:
                result = session.run(f"""
                    MATCH (r:Regulation)
                    RETURN r.name as name, r.region as region, r.applies_to as applies_to
                    ORDER BY r.name
                    LIMIT {limit}
                """)
                return [record.data() for record in result]
        except Exception as e:
            logger.error(f"Error getting regulations: {e}")
            return []
    
    def close(self) -> None:
        """Close the database connection."""
        if self.driver:
            self.driver.close()
            logger.info("Closed Neo4j database connection")

# Example usage
if __name__ == "__main__":
    # Initialize the integrator
    integrator = Neo4jIntegrator()
    
    # If you want to test it with actual Cypher queries:
    # test_queries = ["CREATE (n:Test {name: 'Test'}) RETURN n"]
    # integrator.load_data(test_queries)
    
    # Check if connection works and get stats
    if integrator.driver:
        print(f"Connected to Neo4j at {integrator.uri}")
        print(f"Regulation count: {integrator.get_regulation_count()}")
    else:
        print("Failed to connect to Neo4j")
    
    # Close connection
    integrator.close()