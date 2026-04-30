
import json
from typing import Dict, Any, Optional, List

class Node:
    def __init__(self, node_id: str, node_type: str, properties: Optional[Dict[str, Any]] = None):
        self.node_id = node_id
        self.node_type = node_type
        self.properties = properties if properties is not None else {}

    def to_dict(self):
        return {"node_id": self.node_id, "node_type": self.node_type, "properties": self.properties}

class Relationship:
    def __init__(self, relationship_id: str, relationship_type: str,
                 source_node_id: str, target_node_id: str,
                 properties: Optional[Dict[str, Any]] = None):
        self.relationship_id = relationship_id
        self.relationship_type = relationship_type
        self.source_node_id = source_node_id
        self.target_node_id = target_node_id
        self.properties = properties if properties is not None else {}

    def to_dict(self):
        return {
            "relationship_id": self.relationship_id,
            "relationship_type": self.relationship_type,
            "source_node_id": self.source_node_id,
            "target_node_id": self.target_node_id,
            "properties": self.properties
        }

class RegulatoryGraphProcessor:
    def __init__(self, schema: Optional[Dict[str, Any]] = None):
        self.nodes: Dict[str, Node] = {}
        self.relationships: Dict[str, Relationship] = {}
        self.schema = schema if schema is not None else {}

    def create_node(self, node_id: str, node_type: str, properties: Optional[Dict[str, Any]] = None) -> Node:
        if node_id in self.nodes:
            raise ValueError(f"Node with ID '{node_id}' already exists.")
        node = Node(node_id, node_type, properties)
        self.nodes[node_id] = node
        print(f"Created node: {node.to_dict()}")
        return node

    def get_node(self, node_id: str) -> Optional[Node]:
        node = self.nodes.get(node_id)
        if node:
            print(f"Retrieved node: {node.to_dict()}")
        else:
            print(f"Node with ID '{node_id}' not found.")
        return node

    def update_node(self, node_id: str, properties: Dict[str, Any]) -> Optional[Node]:
        node = self.nodes.get(node_id)
        if node:
            node.properties.update(properties)
            print(f"Updated node: {node.to_dict()}")
            return node
        else:
            print(f"Node with ID '{node_id}' not found for update.")
            return None

    def delete_node(self, node_id: str) -> bool:
        if node_id in self.nodes:
            del self.nodes[node_id]
            # Also delete relationships connected to this node
            self.relationships = {
                rel_id: rel for rel_id, rel in self.relationships.items()
                if rel.source_node_id != node_id and rel.target_node_id != node_id
            }
            print(f"Deleted node with ID '{node_id}'.")
            return True
        else:
            print(f"Node with ID '{node_id}' not found for deletion.")
            return False

    def create_relationship(self, relationship_id: str, relationship_type: str,
                            source_node_id: str, target_node_id: str,
                            properties: Optional[Dict[str, Any]] = None) -> Relationship:
        if relationship_id in self.relationships:
            raise ValueError(f"Relationship with ID '{relationship_id}' already exists.")
        if source_node_id not in self.nodes:
            raise ValueError(f"Source node with ID '{source_node_id}' does not exist.")
        if target_node_id not in self.nodes:
            raise ValueError(f"Target node with ID '{target_node_id}' does not exist.")

        relationship = Relationship(relationship_id, relationship_type, source_node_id, target_node_id, properties)
        self.relationships[relationship_id] = relationship
        print(f"Created relationship: {relationship.to_dict()}")
        return relationship

    def get_relationship(self, relationship_id: str) -> Optional[Relationship]:
        relationship = self.relationships.get(relationship_id)
        if relationship:
            print(f"Retrieved relationship: {relationship.to_dict()}")
        else:
            print(f"Relationship with ID '{relationship_id}' not found.")
        return relationship

    def update_relationship(self, relationship_id: str, properties: Dict[str, Any]) -> Optional[Relationship]:
        relationship = self.relationships.get(relationship_id)
        if relationship:
            relationship.properties.update(properties)
            print(f"Updated relationship: {relationship.to_dict()}")
            return relationship
        else:
            print(f"Relationship with ID '{relationship_id}' not found for update.")
            return None

    def delete_relationship(self, relationship_id: str) -> bool:
        if relationship_id in self.relationships:
            del self.relationships[relationship_id]
            print(f"Deleted relationship with ID '{relationship_id}'.")
            return True
        else:
            print(f"Relationship with ID '{relationship_id}' not found for deletion.")
            return False

    def validate_schema(self) -> bool:
        if not self.schema:
            print("No schema provided for validation.")
            return True # Or False, depending on whether an empty schema is considered valid

        is_valid = True
        # Simplified validation: Check if node types and relationship types adhere to schema if defined
        # This is a placeholder and should be expanded based on the actual schema definition
        defined_node_types = {node_type for node_type in self.schema.get("node_types", {}).keys()}
        defined_relationship_types = {rel_type for rel_type in self.schema.get("relationship_types", {}).keys()}

        for node in self.nodes.values():
            if node.node_type not in defined_node_types:
                print(f"Validation Error: Node '{node.node_id}' has unknown type '{node.node_type}'.")
                is_valid = False

        for relationship in self.relationships.values():
            if relationship.relationship_type not in defined_relationship_types:
                print(f"Validation Error: Relationship '{relationship.relationship_id}' has unknown type '{relationship.relationship_type}'.")
                is_valid = False

        if is_valid:
            print("Graph validated against schema successfully.")
        else:
            print("Graph validation against schema failed.")
        return is_valid

    def serialize_graph(self) -> Dict[str, Any]:
        return {
            "nodes": [node.to_dict() for node in self.nodes.values()],
            "relationships": [rel.to_dict() for rel in self.relationships.values()],
            "schema": self.schema
        }

    def deserialize_graph(self, graph_data: Dict[str, Any]):
        self.nodes = {}
        self.relationships = {}
        self.schema = graph_data.get("schema", {})

        for node_data in graph_data.get("nodes", []):
            node = Node(node_data["node_id"], node_data["node_type"], node_data.get("properties", {}))
            self.nodes[node.node_id] = node

        for rel_data in graph_data.get("relationships", []):
            rel = Relationship(rel_data["relationship_id"], rel_data["relationship_type"],
                               rel_data["source_node_id"], rel_data["target_node_id"],
                               rel_data.get("properties", {}))
            self.relationships[rel.relationship_id] = rel
