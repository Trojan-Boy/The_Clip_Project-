#!/usr/bin/env python3
"""
Regulatory Knowledge Graph Data Processing Pipeline
Enhanced version with Neo4j Cypher query generation

This module processes the regulatory matrix CSV and generates Cypher queries
for loading data into a Neo4j graph database.
"""

import csv
import json
from datetime import datetime
from typing import List, Dict, Tuple, Set
import re


class RegulatoryDataProcessor:
    """Process regulatory data and generate graph database queries"""
    
    def __init__(self, csv_path: str = "complyflow_regulatory_matrix.csv"):
        self.csv_path = csv_path
        self.nodes = set()
        self.relationships = []
        self.cypher_queries = []
        
    def parse_cost_range(self, cost_str: str) -> Dict:
        """Parse cost range strings like '$5,000-$15,000'"""
        if not cost_str or cost_str.strip() == '':
            return {'min': 0, 'max': 0, 'currency': 'USD'}
        
        # Remove currency symbols and commas
        cleaned = cost_str.replace('$', '').replace(',', '').replace('€', '')
        
        # Check for range
        if '-' in cleaned:
            parts = cleaned.split('-')
            try:
                min_val = float(parts[0].strip())
                max_val = float(parts[1].strip())
                return {'min': min_val, 'max': max_val, 'currency': 'USD'}
            except (ValueError, IndexError):
                return {'min': 0, 'max': 0, 'currency': 'USD'}
        else:
            try:
                val = float(cleaned.strip())
                return {'min': val, 'max': val, 'currency': 'USD'}
            except ValueError:
                return {'min': 0, 'max': 0, 'currency': 'USD'}
    
    def parse_penalties(self, penalty_str: str) -> List[Dict]:
        """Parse penalty descriptions into structured data"""
        penalties = []
        
        if not penalty_str:
            return penalties
        
        # Common patterns in penalty strings
        patterns = [
            r'(\d+(?:\.\d+)?)%\s+(?:global\s+)?(?:revenue|turnover)',
            r'€(\d+(?:,\d+)*(?:\.\d+)?[MK]?)',
            r'\$(\d+(?:,\d+)*(?:\.\d+)?[MK]?)',
            r'£(\d+(?:,\d+)*(?:\.\d+)?[MK]?)',
            r'(\d+(?:,\d+)*(?:\.\d+)?)\s+per\s+violation',
            r'up to \$(\d+(?:,\d+)*(?:\.\d+)?[MK]?)',
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, penalty_str, re.IGNORECASE)
            for match in matches:
                # Clean the matched value
                cleaned = match.replace(',', '')
                if 'M' in cleaned.upper():
                    value = float(cleaned.upper().replace('M', '')) * 1000000
                elif 'K' in cleaned.upper():
                    value = float(cleaned.upper().replace('K', '')) * 1000
                else:
                    try:
                        value = float(cleaned)
                    except ValueError:
                        continue
                
                penalties.append({
                    'type': 'monetary',
                    'value': value,
                    'description': penalty_str[:100]  # First 100 chars
                })
        
        return penalties
    
    def extract_keywords(self, text: str) -> List[str]:
        """Extract keywords from text for tagging"""
        if not text:
            return []
        
        # Common compliance keywords
        keywords = []
        common_terms = [
            'privacy', 'security', 'data protection', 'breach notification',
            'consumer rights', 'consent', 'transparency', 'accountability',
            'risk assessment', 'audit', 'documentation', 'training',
            'access control', 'encryption', 'incident response', 'compliance'
        ]
        
        text_lower = text.lower()
        for term in common_terms:
            if term in text_lower:
                keywords.append(term)
        
        return list(set(keywords))  # Remove duplicates
    
    def process_row(self, row: List[str]) -> Tuple[Set, List]:
        """Process a single CSV row and generate nodes/relationships"""
        local_nodes = set()
        local_relationships = []
        
        try:
            # Map CSV columns
            regulation_name = row[0].strip()
            region = row[1].strip()
            applies_to = row[2].strip()
            key_requirements = row[3].strip()
            compliance_timeline = row[4].strip()
            setup_cost = row[5].strip()
            annual_cost = row[6].strip()
            penalties = row[7].strip()
            automation_potential = row[8].strip()
            priority = row[9].strip() if len(row) > 9 else '3'
            
            # Generate unique IDs
            regulation_id = f"REG_{regulation_name.replace(' ', '_').replace('/', '_').upper()}"
            region_id = f"REGION_{region.replace(' ', '_').upper()}"
            
            # Parse costs
            setup_cost_parsed = self.parse_cost_range(setup_cost)
            annual_cost_parsed = self.parse_cost_range(annual_cost)
            penalties_parsed = self.parse_penalties(penalties)
            
            # Extract keywords
            keywords = self.extract_keywords(key_requirements)
            keywords.extend(self.extract_keywords(compliance_timeline))
            
            # Create Regulation node
            regulation_node = {
                'id': regulation_id,
                'label': 'Regulation',
                'properties': {
                    'name': regulation_name,
                    'region': region,
                    'keyRequirements': key_requirements,
                    'complianceTimeline': compliance_timeline,
                    'automationPotential': automation_potential,
                    'priority': int(priority) if priority.isdigit() else 3,
                    'setupCostMin': setup_cost_parsed['min'],
                    'setupCostMax': setup_cost_parsed['max'],
                    'annualCostMin': annual_cost_parsed['min'],
                    'annualCostMax': annual_cost_parsed['max'],
                    'keywords': keywords,
                    'importedAt': datetime.now().isoformat()
                }
            }
            local_nodes.add((regulation_id, 'Regulation', regulation_node['properties']))
            
            # Create Region node
            region_node = {
                'id': region_id,
                'label': 'Region',
                'properties': {
                    'name': region,
                    'type': self.classify_region_type(region)
                }
            }
            local_nodes.add((region_id, 'Region', region_node['properties']))
            
            # REGULATION -> APPLIES_IN -> REGION relationship
            local_relationships.append((regulation_id, 'APPLIES_IN', region_id, {}))
            
            # Process Applies To entities
            applies_to_entities = [e.strip() for e in applies_to.split(' OR ')]
            for entity in applies_to_entities:
                if entity:
                    entity_id = f"ENTITY_{entity.replace(' ', '_').replace('+', '_').upper()[:50]}"
                    entity_type = self.classify_entity_type(entity)
                    
                    entity_node = {
                        'id': entity_id,
                        'label': 'Entity',
                        'properties': {
                            'name': entity,
                            'type': entity_type
                        }
                    }
                    local_nodes.add((entity_id, 'Entity', entity_node['properties']))
                    
                    # REGULATION -> APPLIES_TO -> ENTITY relationship
                    local_relationships.append((regulation_id, 'APPLIES_TO', entity_id, {}))
            
            # Create Penalty nodes if applicable
            for i, penalty in enumerate(penalties_parsed):
                penalty_id = f"PENALTY_{regulation_id}_{i}"
                penalty_node = {
                    'id': penalty_id,
                    'label': 'Penalty',
                    'properties': {
                        'type': penalty['type'],
                        'value': penalty['value'],
                        'description': penalty['description'],
                        'currency': 'USD'
                    }
                }
                local_nodes.add((penalty_id, 'Penalty', penalty_node['properties']))
                
                # REGULATION -> HAS_PENALTY -> PENALTY relationship
                local_relationships.append((regulation_id, 'HAS_PENALTY', penalty_id, {}))
            
            # Create Requirement nodes from key requirements
            # For simplicity, we'll create one requirement node per regulation for now
            requirement_id = f"REQ_{regulation_id}"
            requirement_node = {
                'id': requirement_id,
                'label': 'Requirement',
                'properties': {
                    'summary': key_requirements[:500],  # Truncate if too long
                    'complexity': self.estimate_complexity(key_requirements),
                    'category': self.classify_requirement_category(key_requirements)
                }
            }
            local_nodes.add((requirement_id, 'Requirement', requirement_node['properties']))
            
            # REGULATION -> HAS_REQUIREMENT -> REQUIREMENT relationship
            local_relationships.append((regulation_id, 'HAS_REQUIREMENT', requirement_id, {}))
            
        except Exception as e:
            print(f"Error processing row: {row}")
            print(f"Error details: {e}")
        
        return local_nodes, local_relationships
    
    def classify_region_type(self, region: str) -> str:
        """Classify region type (country, state, international, etc.)"""
        region_lower = region.lower()
        
        if 'united states' in region_lower or 'usa' in region_lower:
            return 'country'
        elif 'california' in region_lower or 'virginia' in region_lower or 'colorado' in region_lower:
            return 'state'
        elif 'european union' in region_lower or 'eu' in region_lower:
            return 'supranational'
        elif 'global' in region_lower or 'international' in region_lower:
            return 'global'
        else:
            return 'country'
    
    def classify_entity_type(self, entity: str) -> str:
        """Classify entity type (business, organization, industry, etc.)"""
        entity_lower = entity.lower()
        
        if 'business' in entity_lower:
            return 'business'
        elif 'company' in entity_lower or 'organization' in entity_lower:
            return 'organization'
        elif 'provider' in entity_lower or 'healthcare' in entity_lower:
            return 'industry_sector'
        elif 'consumer' in entity_lower or 'individual' in entity_lower:
            return 'individual'
        else:
            return 'general'
    
    def estimate_complexity(self, requirements: str) -> str:
        """Estimate complexity based on requirements text"""
        word_count = len(requirements.split())
        
        if word_count < 50:
            return 'Low'
        elif word_count < 150:
            return 'Medium'
        else:
            return 'High'
    
    def classify_requirement_category(self, requirements: str) -> str:
        """Classify requirement category based on content"""
        req_lower = requirements.lower()
        
        if 'privacy' in req_lower:
            return 'Privacy'
        elif 'security' in req_lower or 'encryption' in req_lower or 'access' in req_lower:
            return 'Security'
        elif 'notification' in req_lower or 'breach' in req_lower:
            return 'Incident Response'
        elif 'right' in req_lower or 'consent' in req_lower:
            return 'Individual Rights'
        elif 'audit' in req_lower or 'documentation' in req_lower:
            return 'Governance'
        else:
            return 'General'
    
    def generate_cypher_queries(self, nodes: Set, relationships: List) -> List[str]:
        """Generate Neo4j Cypher queries from nodes and relationships"""
        queries = []
        
        # Create constraint/index for performance
        queries.append("CREATE CONSTRAINT regulation_id IF NOT EXISTS FOR (r:Regulation) REQUIRE r.id IS UNIQUE;")
        queries.append("CREATE CONSTRAINT region_id IF NOT EXISTS FOR (r:Region) REQUIRE r.id IS UNIQUE;")
        queries.append("CREATE CONSTRAINT entity_id IF NOT EXISTS FOR (e:Entity) REQUIRE e.id IS UNIQUE;")
        
        # Create nodes
        for node_id, label, properties in nodes:
            # Format properties for Cypher
            props_str = ', '.join([f'{k}: ${k}' for k in properties.keys()])
            
            # For string properties with quotes, handle escaping
            escaped_props = {}
            for k, v in properties.items():
                if isinstance(v, str):
                    # Escape quotes and newlines
                    escaped = v.replace('\\', '\\\\').replace('"', '\\"').replace("'", "\\'")
                    escaped = escaped.replace('\n', '\\n').replace('\r', '\\r')
                    escaped_props[k] = escaped
                else:
                    escaped_props[k] = v
            
            query = f"MERGE (n:{label} {{id: '{node_id}'}})"
            if escaped_props:
                query += f"\nSET n += {json.dumps(escaped_props, default=str)}"
            queries.append(query)
        
        # Create relationships
        for source_id, rel_type, target_id, properties in relationships:
            props_str = ''
            if properties:
                props_str = f" {{ {', '.join([f'{k}: {json.dumps(v)}' for k, v in properties.items()])} }}"
            
            query = f"""
            MATCH (source {{id: '{source_id}'}})
            MATCH (target {{id: '{target_id}'}})
            MERGE (source)-[:{rel_type}{props_str}]->(target)
            """
            queries.append(query)
        
        return queries
    
    def process_csv(self) -> Tuple[Set, List]:
        """Process the entire CSV file"""
        all_nodes = set()
        all_relationships = []
        
        try:
            with open(self.csv_path, 'r', encoding='utf-8') as file:
                reader = csv.reader(file)
                header = next(reader)  # Skip header
                
                print(f"Processing CSV with columns: {header}")
                print(f"Processing {self.csv_path}...")
                
                for i, row in enumerate(reader, 1):
                    if len(row) < 8:  # Minimum required columns
                        print(f"Skipping row {i}: insufficient columns")
                        continue
                    
                    nodes, relationships = self.process_row(row)
                    all_nodes.update(nodes)
                    all_relationships.extend(relationships)
                    
                    if i % 5 == 0:
                        print(f"Processed {i} rows...")
                
                print(f"Processing complete. Generated {len(all_nodes)} nodes and {len(all_relationships)} relationships.")
                
        except FileNotFoundError:
            print(f"Error: CSV file not found at {self.csv_path}")
            print("Please ensure the regulatory matrix CSV file exists in the workspace root.")
        except Exception as e:
            print(f"Error processing CSV: {e}")
        
        return all_nodes, all_relationships
    
    def save_cypher_queries(self, queries: List[str], output_path: str = "cypher_import.cypher"):
        """Save Cypher queries to a file"""
        try:
            with open(output_path, 'w', encoding='utf-8') as f:
                for query in queries:
                    f.write(query + "\n\n")
            print(f"Cypher queries saved to {output_path}")
        except Exception as e:
            print(f"Error saving Cypher queries: {e}")
    
    def save_json_output(self, nodes: Set, relationships: List, output_path: str = "graph_data.json"):
        """Save processed data as JSON for inspection"""
        try:
            output = {
                'metadata': {
                    'generatedAt': datetime.now().isoformat(),
                    'sourceFile': self.csv_path,
                    'nodeCount': len(nodes),
                    'relationshipCount': len(relationships)
                },
                'nodes': [
                    {'id': n[0], 'label': n[1], 'properties': n[2]} 
                    for n in nodes
                ],
                'relationships': [
                    {'source': r[0], 'type': r[1], 'target': r[2], 'properties': r[3]}
                    for r in relationships
                ]
            }
            
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(output, f, indent=2, default=str)
            
            print(f"JSON output saved to {output_path}")
        except Exception as e:
            print(f"Error saving JSON output: {e}")
    
    def run(self):
        """Main processing pipeline"""
        print("=" * 60)
        print("Regulatory Knowledge Graph Data Processing Pipeline")
        print("=" * 60)
        
        # Process CSV
        nodes, relationships = self.process_csv()
        
        if not nodes:
            print("No data processed. Exiting.")
            return
        
        # Generate Cypher queries
        print("\nGenerating Cypher queries...")
        cypher_queries = self.generate_cypher_queries(nodes, relationships)
        print(f"Generated {len(cypher_queries)} Cypher queries")
        
        # Save outputs
        self.save_cypher_queries(cypher_queries, "knowledge_graph_pipeline/ingestion/cypher_import.cypher")
        self.save_json_output(nodes, relationships, "knowledge_graph_pipeline/ingestion/graph_data.json")
        
        # Print summary
        print("\n" + "=" * 60)
        print("PROCESSING COMPLETE")
        print("=" * 60)
        print(f"Total Nodes: {len(nodes)}")
        print(f"Total Relationships: {len(relationships)}")
        
        # Count by node type
        node_types = {}
        for node_id, label, _ in nodes:
            node_types[label] = node_types.get(label, 0) + 1
        
        print("\nNode Type Breakdown:")
        for label, count in node_types.items():
            print(f"  {label}: {count}")
        
        # Count by relationship type
        rel_types = {}
        for _, rel_type, _, _ in relationships:
            rel_types[rel_type] = rel_types.get(rel_type, 0) + 1
        
        print("\nRelationship Type Breakdown:")
        for rel_type, count in rel_types.items():
            print(f"  {rel_type}: {count}")
        
        print("\nNext steps:")
        print("1. Review generated Cypher queries in cypher_import.cypher")
        print("2. Load into Neo4j using: neo4j-admin import or Cypher Shell")
        print("3. Test queries with: MATCH (n) RETURN n LIMIT 25")


def main():
    """Main entry point"""
    processor = RegulatoryDataProcessor()
    processor.run()


if __name__ == "__main__":
    main()