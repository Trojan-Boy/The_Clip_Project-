from knowledge_graph_pipeline.ingestion.csv_ingestor import CsvIngestor
import os

def test_csv_ingestor():
    print("\n--- Testing CsvIngestor ---")

    # Test case 1: Successful ingestion and schema validation
    csv_file_path = 'example.csv'
    ingestor = CsvIngestor()
    source_config = {'filepath': csv_file_path, 'header': True}
    schema = {'required_headers': ['id', 'name', 'description']}

    print(f"Attempting to ingest from {csv_file_path}...")
    data = ingestor.ingest(source_config)
    print(f"Ingested data: {data}")

    if data:
        print("Data ingested successfully.")
        if ingestor.validate_schema(data, schema):
            print("Schema validation successful.")
        else:
            print("Schema validation failed.")
    else:
        print("Data ingestion failed.")

    # Test case 2: File not found
    print("\nAttempting to ingest from a non-existent file...")
    non_existent_file = 'non_existent.csv'
    source_config_fail = {'filepath': non_existent_file, 'header': True}
    data_fail = ingestor.ingest(source_config_fail)
    if not data_fail:
        print(f"Successfully handled 'file not found' for {non_existent_file}.")
    else:
        print(f"Failed to handle 'file not found' for {non_existent_file}.")

    # Test case 3: Schema validation failure (missing header)
    print("\nAttempting schema validation with missing header...")
    schema_fail = {'required_headers': ['id', 'name', 'missing_header']}
    if data:
        if not ingestor.validate_schema(data, schema_fail):
            print("Successfully identified missing header during schema validation.")
        else:
            print("Failed to identify missing header.")
    
    print("--- CsvIngestor testing complete ---")

if __name__ == '__main__':
    # The os.chdir is problematic when running from a higher level, 
    # better to add the parent directory to the path or run from package root
    # For this test, we assume it's run with `python -m knowledge_graph_pipeline.test_ingestion`
    # or similar, or adjust sys.path if running directly.
    # For simplicity, we'll try to run by adding current dir to python path if not found
    import sys
    current_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(current_dir) # This should be 'server' or the root containing 'knowledge_graph_pipeline'
    project_root = os.path.dirname(project_root) # One more level up if running from server/knowledge_graph_pipeline/test_ingestion.py
    
    # Adjust for relative path from current execution context to the project root
    # This part may need manual adjustment based on where the interactive shell runs python.
    # For now, let's assume the python command is run from the directory *containing* knowledge_graph_pipeline
    # if __name__ == '__main__':
    # This is a bit tricky with interactive execution, let's simplify for now.
    # If running 'python -m knowledge_graph_pipeline.test_ingestion', the imports should work.
    # If running 'python test_ingestion.py' from knowledge_graph_pipeline/, path will fail.
    # Let's add __init__.py files and assume the execution instruction helps.
    test_csv_ingestor()
