import csv
import json
import os
from knowledge_graph_pipeline.RegulatoryGraphProcessor import RegulatoryGraphProcessor, Node, Relationship

def process_regulatory_matrix(csv_content: str) -> RegulatoryGraphProcessor:
    # Define a basic schema based on the CSV data for validation
    schema = {
        "node_types": {
            "Regulation": {},
            "Region": {},
            "AppliesTo": {},
            "Requirement": {},
            "Penalty": {},
            "ComplianceTimelineDescription": {},
            "AutomationPotentialValue": {},
        },
        "relationship_types": {
            "APPLIES_IN_REGION": {},
            "APPLIES_TO_ENTITY": {},
            "COVERS_REQUIREMENT_TEXT": {},
            "HAS_PENALTY_TEXT": {},
            "HAS_COMPLIANCE_TIMELINE_DESC": {},
            "HAS_AUTOMATION_POTENTIAL_VAL": {},
        }
    }
    processor = RegulatoryGraphProcessor(schema=schema)

    reader = csv.reader(csv_content.strip().splitlines())
    header = next(reader)  # Skip header

    for i, row in enumerate(reader):
        if not row:  # Skip empty rows
            continue

        # Ensure consistent column access
        # Using try-except for robustness against malformed rows
        try:
            regulation_name = row[0].strip()
            region = row[1].strip()
            applies_to_str = row[2].strip()
            key_requirements_str = row[3].strip()
            compliance_timeline = row[4].strip()
            penalties_str = row[7].strip()
            automation_potential = row[8].strip()
        except IndexError:
            print(f"Skipping malformed row {i+1}: {row}")
            continue

        # Create Regulation node
        regulation_node_id = f"Regulation:{regulation_name}"
        processor.create_node(regulation_node_id, "Regulation", {"name": regulation_name})
        
        # Add Compliance Timeline and Automation Potential as nodes and relationships
        if compliance_timeline:
            timeline_node_id = f"ComplianceTimelineDescription:{compliance_timeline}"
            processor.create_node(timeline_node_id, "ComplianceTimelineDescription", {"description": compliance_timeline})
            processor.create_relationship(f"rel_timeline_{regulation_name}_{i}", "HAS_COMPLIANCE_TIMELINE_DESC", regulation_node_id, timeline_node_id)

        if automation_potential:
            automation_node_id = f"AutomationPotentialValue:{automation_potential}"
            processor.create_node(automation_node_id, "AutomationPotentialValue", {"value": automation_potential})
            processor.create_relationship(f"rel_automation_{regulation_name}_{i}", "HAS_AUTOMATION_POTENTIAL_VAL", regulation_node_id, automation_node_id)

        # Process Region
        if region:
            region_node_id = f"Region:{region}"
            processor.create_node(region_node_id, "Region", {"name": region})
            processor.create_relationship(f"rel_region_{regulation_name}_{i}", "APPLIES_IN_REGION", regulation_node_id, region_node_id)

        # Process Applies To (can be multiple entities separated by 'OR')
        applies_to_entities = [entity.strip() for entity in applies_to_str.split(' OR ') if entity.strip()]
        for j, entity in enumerate(applies_to_entities):
            applies_to_node_id = f"AppliesTo:{entity}"
            processor.create_node(applies_to_node_id, "AppliesTo", {"name": entity})
            processor.create_relationship(f"rel_applies_to_{regulation_name}_{i}_{j}", "APPLIES_TO_ENTITY", regulation_node_id, applies_to_node_id)

        # Process Key Requirements
        if key_requirements_str:
            requirement_node_id = f"Requirement:{key_requirements_str}"
            processor.create_node(requirement_node_id, "Requirement", {"description": key_requirements_str})
            processor.create_relationship(f"rel_req_{regulation_name}_{i}", "COVERS_REQUIREMENT_TEXT", regulation_node_id, requirement_node_id)

        # Process Penalties
        if penalties_str:
            penalty_node_id = f"Penalty:{penalties_str}"
            processor.create_node(penalty_node_id, "Penalty", {"description": penalties_str})
            processor.create_relationship(f"rel_penalty_{regulation_name}_{i}", "HAS_PENALTY_TEXT", regulation_node_id, penalty_node_id)
    
    return processor

if __name__ == '__main__':
    script_dir = os.path.dirname(__file__)
    csv_fixture_path = os.path.join(script_dir, "..", "complyflow_regulatory_matrix.csv")
    output_json_path = os.path.join(script_dir, "regulatory_knowledge_graph.json")

    try:
        with open(csv_fixture_path, 'r', encoding='utf-8') as f:
            csv_data = f.read()
    except FileNotFoundError:
        print(f"Error: The file {csv_fixture_path} was not found.")
        print("Please ensure 'complyflow_regulatory_matrix.csv' is in the project root directory.")
        exit(1)

    graph_processor = process_regulatory_matrix(csv_data)
    print("\n--- Graph Processing Complete ---")
    print(f"Nodes created: {len(graph_processor.nodes)}")
    print(f"Relationships created: {len(graph_processor.relationships)}")

    # Validate the graph against the schema
    print("\n--- Running Schema Validation ---")
    is_valid = graph_processor.validate_schema()
    print(f"Graph schema valid: {is_valid}")

    # Serialize and save the graph for later use
    with open(output_json_path, "w", encoding="utf-8") as f:
        json.dump(serialized_graph, f, indent=4)
    print(f"Graph serialized to '{output_json_path}'")

    # Example of deserializing and accessing data
    with open(output_json_path, "r", encoding="utf-8") as f:
        loaded_graph_data = json.load(f)
    
    loaded_processor = RegulatoryGraphProcessor()
    loaded_processor.deserialize_graph(loaded_graph_data)
    print("\n--- Deserialized Graph Info ---")
    print(f"Loaded nodes: {len(loaded_processor.nodes)}")
    print(f"Loaded relationships: {len(loaded_processor.relationships)}")
  