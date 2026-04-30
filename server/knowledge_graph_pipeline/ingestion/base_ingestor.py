from abc import ABC, abstractmethod
from typing import Any

class Ingestor(ABC):
    """Abstract base class for data ingestors."""

    @abstractmethod
    def ingest(self, source_config: dict) -> Any:
        """Ingests data from a specified source.

        Args:
            source_config (dict): Configuration details for the data source.

        Returns:
            Any: The ingested raw data.
        """
        pass

    @abstractmethod
    def validate_schema(self, data: Any, schema: dict) -> bool:
        """Validates the schema of the ingested data.

        Args:
            data (Any): The data to validate.
            schema (dict): The schema to validate against.

        Returns:
            bool: True if the data conforms to the schema, False otherwise.
        """
        pass

    @abstractmethod
    def handle_error(self, error: Exception, context: str):
        """Handles errors during the ingestion process.

        Args:
            error (Exception): The exception that occurred.
            context (str): A description of where the error occurred.
        """
        pass
