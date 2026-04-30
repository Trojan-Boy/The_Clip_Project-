
import unittest
from .RegulatoryGraphProcessor import RegulatoryGraphProcessor, Node, Relationship

class TestRegulatoryGraphProcessor(unittest.TestCase):

    def setUp(self):
        self.processor = RegulatoryGraphProcessor()

    def test_create_node(self):
        node = self.processor.create_node("n1", "Regulation", {"name": "GDPR"})
        self.assertIsNotNone(node)
        self.assertEqual(node.node_id, "n1")
        self.assertEqual(node.node_type, "Regulation")
        self.assertEqual(node.properties["name"], "GDPR")
        self.assertIn("n1", self.processor.nodes)

    def test_get_node(self):
        self.processor.create_node("n1", "Regulation", {"name": "GDPR"})
        node = self.processor.get_node("n1")
        self.assertIsNotNone(node)
        self.assertEqual(node.node_id, "n1")

    def test_update_node(self):
        self.processor.create_node("n1", "Regulation", {"name": "GDPR"})
        updated_node = self.processor.update_node("n1", {"version": "1.0"})
        self.assertIsNotNone(updated_node)
        self.assertEqual(updated_node.properties["version"], "1.0")
        self.assertEqual(self.processor.get_node("n1").properties["version"], "1.0")

    def test_delete_node(self):
        self.processor.create_node("n1", "Regulation", {"name": "GDPR"})
        self.assertTrue(self.processor.delete_node("n1"))
        self.assertIsNone(self.processor.get_node("n1"))

    def test_create_relationship(self):
        self.processor.create_node("n1", "Regulation")
        self.processor.create_node("n2", "Article")
        rel = self.processor.create_relationship("r1", "HAS_ARTICLE", "n1", "n2", {"order": 1})
        self.assertIsNotNone(rel)
        self.assertEqual(rel.relationship_id, "r1")
        self.assertEqual(rel.relationship_type, "HAS_ARTICLE")
        self.assertEqual(rel.source_node_id, "n1")
        self.assertEqual(rel.target_node_id, "n2")
        self.assertEqual(rel.properties["order"], 1)
        self.assertIn("r1", self.processor.relationships)

    def test_get_relationship(self):
        self.processor.create_node("n1", "Regulation")
        self.processor.create_node("n2", "Article")
        self.processor.create_relationship("r1", "HAS_ARTICLE", "n1", "n2")
        rel = self.processor.get_relationship("r1")
        self.assertIsNotNone(rel)
        self.assertEqual(rel.relationship_id, "r1")

    def test_update_relationship(self):
        self.processor.create_node("n1", "Regulation")
        self.processor.create_node("n2", "Article")
        self.processor.create_relationship("r1", "HAS_ARTICLE", "n1", "n2")
        updated_rel = self.processor.update_relationship("r1", {"level": "high"})
        self.assertIsNotNone(updated_rel)
        self.assertEqual(updated_rel.properties["level"], "high")
        self.assertEqual(self.processor.get_relationship("r1").properties["level"], "high")

    def test_delete_relationship(self):
        self.processor.create_node("n1", "Regulation")
        self.processor.create_node("n2", "Article")
        self.processor.create_relationship("r1", "HAS_ARTICLE", "n1", "n2")
        self.assertTrue(self.processor.delete_relationship("r1"))
        self.assertIsNone(self.processor.get_relationship("r1"))

    def test_delete_node_deletes_relationships(self):
        self.processor.create_node("n1", "Regulation")
        self.processor.create_node("n2", "Article")
        self.processor.create_relationship("r1", "HAS_ARTICLE", "n1", "n2")
        self.processor.delete_node("n1")
        self.assertIsNone(self.processor.get_node("n1"))
        self.assertIsNone(self.processor.get_relationship("r1"))

    def test_schema_validation_empty(self):
        self.assertTrue(self.processor.validate_schema())

    def test_schema_validation_valid(self):
        schema = {
            "node_types": {"Regulation": {}, "Article": {}},
            "relationship_types": {"HAS_ARTICLE": {}}
        }
        processor = RegulatoryGraphProcessor(schema)
        processor.create_node("n1", "Regulation")
        processor.create_node("n2", "Article")
        processor.create_relationship("r1", "HAS_ARTICLE", "n1", "n2")
        self.assertTrue(processor.validate_schema())

    def test_schema_validation_invalid_node_type(self):
        schema = {
            "node_types": {"Regulation": {}},
            "relationship_types": {"HAS_ARTICLE": {}}
        }
        processor = RegulatoryGraphProcessor(schema)
        processor.create_node("n1", "UnknownType") # Should fail validation
        self.assertFalse(processor.validate_schema())

    def test_schema_validation_invalid_relationship_type(self):
        schema = {
            "node_types": {"Regulation": {}, "Article": {}},
            "relationship_types": {"HAS_ARTICLE": {}}
        }
        processor = RegulatoryGraphProcessor(schema)
        processor.create_node("n1", "Regulation")
        processor.create_node("n2", "Article")
        processor.create_relationship("r1", "UNKNOWN_REL", "n1", "n2") # Should fail validation
        self.assertFalse(processor.validate_schema())

    def test_serialize_deserialize(self):
        schema = {
            "node_types": {"Regulation": {}, "Article": {}},
            "relationship_types": {"HAS_ARTICLE": {}}
        }
        self.processor = RegulatoryGraphProcessor(schema)
        self.processor.create_node("n1", "Regulation", {"name": "GDPR"})
        self.processor.create_node("n2", "Article", {"title": "Article 1"})
        self.processor.create_relationship("r1", "HAS_ARTICLE", "n1", "n2", {"order": 1})

        serialized_data = self.processor.serialize_graph()
        new_processor = RegulatoryGraphProcessor()
        new_processor.deserialize_graph(serialized_data)

        self.assertEqual(len(self.processor.nodes), len(new_processor.nodes))
        self.assertEqual(len(self.processor.relationships), len(new_processor.relationships))
        self.assertEqual(self.processor.get_node("n1").properties["name"], new_processor.get_node("n1").properties["name"])
        self.assertEqual(self.processor.get_relationship("r1").properties["order"], new_processor.get_relationship("r1").properties["order"])

if __name__ == '__main__':
    unittest.main()
