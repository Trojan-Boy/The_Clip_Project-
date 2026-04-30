#!/usr/bin/env python3
"""
Knowledge Graph Data Processing Pipeline Orchestrator

This script orchestrates the complete pipeline for processing regulatory data
into a knowledge graph database.
"""

import sys
import logging
from typing import Dict, List

# Import our pipeline components
from ingestion.csv_ingestor import CsvIngestor
from ingestion.process_regulatory_data import RegulatoryDataProcessor
from transformation.data_transformer import DataTransformer
from graph_integration.neo4j_integrator import Neo4jIntegrator

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class PipelineOrchestrator:
    """Orchestrates the complete knowledge graph data processing pipeline."""
    
    def __init__(self):
        self.ingestor = CsvIngestor()
        self.transformer = DataTransformer()
        self.processor = RegulatoryDataProcessor()
        self.integrator = Neo4jIntegrator()
        
    def run_pipeline(self, csv_path: str = "complyflow_regulatory_matrix.csv") -> bool:
        """Run the complete data processing pipeline."""
        try:
            logger.info("Starting Knowledge Graph Data Processing Pipeline")
            
            # Step 1: Ingest data from CSV
            logger.info(f"Step 1: Ingesting data from {csv_path}")
            source_config = {'filepath': csv_path, 'header': True}
            raw_data = self.ingestor.ingest(source_config)
            
            if not raw_data:
                logger.error("Failed to ingest data from CSV")
                return False
            
            logger.info(f"Successfully ingested {len(raw_data)} records from CSV")
            
            # Step 2: Transform and enrich data
            logger.info("Step 2: Transforming and enriching data")
            transformed_data = self.transformer.transform(raw_data)
            
            if not transformed_data:
                logger.error("Failed to transform data")
                return False
            
            logger.info(f"Successfully transformed {len(transformed_data)} records")
            
            # Step 3: Process data into graph structure
            logger.info("Step 3: Processing data into graph structure")
            cypher_queries = self.processor.process_data(transformed_data)
            
            if not cypher_queries:
                logger.error("Failed to generate Cypher queries")
                return False
            
            logger.info(f"Successfully generated {len(cypher_queries)} Cypher queries")
            
            # Step 4: Integrate with Neo4j database
            logger.info("Step 4: Integrating with Neo4j database")
            success = self.integrator.load_data(cypher_queries)
            
            if success:
                logger.info("Pipeline completed successfully")
                return True
            else:
                logger.error("Failed to load data into Neo4j")
                return False
                
        except Exception as e:
            logger.error(f"Pipeline failed with error: {str(e)}")
            return False

if __name__ == "__main__":
    orchestrator = PipelineOrchestrator()
    
    # Default CSV path
    csv_path = "complyflow_regulatory_matrix.csv"
    
    # Allow override via command line argument
    if len(sys.argv) > 1:
        csv_path = sys.argv[1]
    
    success = orchestrator.run_pipeline(csv_path)
    
    sys.exit(0 if success else 1)