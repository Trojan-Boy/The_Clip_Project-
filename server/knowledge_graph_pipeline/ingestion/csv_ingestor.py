import csv
import logging
from typing import Any, List, Dict
from .base_ingestor import Ingestor # Changed from knowledge_graph_pipeline.ingestion.base_ingestor

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class CsvIngestor(Ingestor):
    """Ingests data from a CSV file."""

    def ingest(self, source_config: Dict) -> List[Dict]:
        """Ingests data from a specified CSV file.

        Args:
            source_config (Dict): Configuration details for the CSV source, e.g., {'filepath': 'data.csv', 'header': True}.

        Returns:
            List[Dict]: A list of dictionaries, where each dictionary represents a row.
        """
        filepath = source_config.get('filepath')
        if not filepath:
            self.handle_error(ValueError("Filepath not provided for CSV ingestor."), "ingest")
            return []

        data = []
        try:
            with open(filepath, 'r', newline='', encoding='utf-8') as csvfile:
                reader = csv.DictReader(csvfile) if source_config.get('header', True) else csv.reader(csvfile)
                for row in reader:
                    data.append(row)
            logging.info(f"Successfully ingested data from {filepath}")
            return data
        except FileNotFoundError as e:
            self.handle_error(e, f"ingest from {filepath}")
            return []
        except Exception as e:
            self.handle_error(e, f"ingest from {filepath}")
            return []

    def validate_schema(self, data: List[Dict], schema: Dict) -> bool:
        """Validates the schema of the ingested CSV data.

        Args:
            data (List[Dict]): The ingested CSV data.
            schema (Dict): The schema to validate against, e.g., {'required_headers': ['id', 'name']}.

        Returns:
            bool: True if the data conforms to the schema, False otherwise.
        """
        required_headers = schema.get('required_headers', [])
        if not required_headers:
            logging.warning("No required headers specified in schema for CSV validation. Skipping schema validation.")
            return True

        if not data:
            logging.warning("No data to validate for CSV schema.")
            return False

        # Assuming the first row (or DictReader keys) contains headers
        # If data is from DictReader, keys are headers directly
        actual_headers = data[0].keys() if isinstance(data[0], dict) else []

        missing_headers = [header for header in required_headers if header not in actual_headers]
        if missing_headers:
            logging.error(f"Schema validation failed: Missing required headers: {', '.join(missing_headers)}")
            return False

        logging.info("CSV schema validation successful.")
        return True

    def handle_error(self, error: Exception, context: str):
        """Handles errors during the CSV ingestion process.

        Args:
            error (Exception): The exception that occurred.
            context (str): A description of where the error occurred.
        """
        logging.error(f"Error during CSV ingestion ({context}): {error}")

