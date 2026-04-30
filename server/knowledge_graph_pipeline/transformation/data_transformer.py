#!/usr/bin/env python3
"""
Data Transformation Module for Regulatory Knowledge Graph

This module handles the transformation and enrichment of raw regulatory data
into a standardized format suitable for knowledge graph insertion.
"""

import re
from typing import List, Dict, Any
from datetime import datetime

class DataTransformer:
    """Transforms and enriches regulatory data."""
    
    def __init__(self):
        # Common patterns for parsing costs and penalties
        self.cost_pattern = re.compile(r'\$?([0-9,]+(?:\.[0-9]+)?)')
        self.percentage_pattern = re.compile(r'([0-9]+(?:\.[0-9]+)?)%')
        
    def transform(self, raw_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Transform raw regulatory data into standardized format.
        
        Args:
            raw_data: List of dictionaries representing raw regulatory records
            
        Returns:
            List of transformed and enriched records
        """
        transformed_data = []
        
        for record in raw_data:
            try:
                transformed_record = self._transform_single_record(record)
                transformed_data.append(transformed_record)
            except Exception as e:
                print(f"Error transforming record: {e}")
                continue
                
        return transformed_data
    
    def _transform_single_record(self, record: Dict[str, Any]) -> Dict[str, Any]:
        """
        Transform a single regulatory record.
        
        Args:
            record: Raw regulatory record
            
        Returns:
            Transformed and enriched record
        """
        # Create a copy to avoid modifying the original
        transformed = record.copy()
        
        # Standardize column names
        transformed = self._standardize_column_names(transformed)
        
        # Parse cost fields
        if 'smb_costs_setup' in transformed:
            transformed['smb_costs_setup_parsed'] = self._parse_cost_field(transformed['smb_costs_setup'])
        if 'smb_costs_annual' in transformed:
            transformed['smb_costs_annual_parsed'] = self._parse_cost_field(transformed['smb_costs_annual'])
            
        # Parse penalties
        if 'penalties' in transformed:
            transformed['penalties_parsed'] = self._parse_penalty_field(transformed['penalties'])
            
        # Parse compliance timeline
        if 'compliance_timeline' in transformed:
            transformed['timeline_parsed'] = self._parse_timeline_field(transformed['compliance_timeline'])
            
        # Add metadata
        transformed['processed_at'] = datetime.now().isoformat()
        transformed['data_source'] = 'complyflow_regulatory_matrix.csv'
        
        # Standardize values
        transformed = self._standardize_values(transformed)
        
        return transformed
    
    def _standardize_column_names(self, record: Dict[str, Any]) -> Dict[str, Any]:
        """Standardize column names to a consistent format."""
        # Map of old column names to new standardized names
        name_mapping = {
            'Regulation': 'regulation_name',
            'Region': 'region',
            'Applies To': 'applies_to',
            'Key Requirements': 'key_requirements',
            'Compliance Timeline': 'compliance_timeline',
            'SMB Costs (Setup)': 'smb_costs_setup',
            'SMB Costs (Annual)': 'smb_costs_annual',
            'Penalties': 'penalties',
            'Automation Potential': 'automation_potential',
            'ComplyFlow Priority': 'complyflow_priority'
        }
        
        standardized = {}
        for key, value in record.items():
            standardized_key = name_mapping.get(key, key.lower().replace(' ', '_'))
            standardized[standardized_key] = value
            
        return standardized
    
    def _parse_cost_field(self, cost_str: str) -> Dict[str, Any]:
        """Parse cost strings into standardized format."""
        if not cost_str or cost_str.strip() == '':
            return {'min': 0, 'max': 0, 'currency': 'USD'}
        
        # Remove commas and extract numbers
        cleaned = re.sub(r'[^\d.-]', '', cost_str)
        
        if '-' in cleaned:
            parts = cleaned.split('-')
            try:
                min_val = float(parts[0]) if parts[0] else 0
                max_val = float(parts[1]) if len(parts) > 1 and parts[1] else min_val
                return {'min': min_val, 'max': max_val, 'currency': 'USD'}
            except (ValueError, IndexError):
                return {'min': 0, 'max': 0, 'currency': 'USD'}
        else:
            try:
                val = float(cleaned) if cleaned else 0
                return {'min': val, 'max': val, 'currency': 'USD'}
            except ValueError:
                return {'min': 0, 'max': 0, 'currency': 'USD'}
    
    def _parse_penalty_field(self, penalty_str: str) -> List[Dict[str, Any]]:
        """Parse penalty strings into structured data."""
        penalties = []
        
        if not penalty_str:
            return penalties
        
        # Pattern matching for various penalty formats
        # Match $1000-$5000, €2000, 4% of revenue, etc.
        patterns = [
            # Monetary penalties in various formats
            (r'\$([0-9,]+(?:\.[0-9]+)?)', 'monetary'),
            (r'€([0-9,]+(?:\.[0-9]+)?)', 'monetary'),
            (r'£([0-9,]+(?:\.[0-9]+)?)', 'monetary'),
            # Percentage penalties
            (r'([0-9]+(?:\.[0-9]+)?)%', 'percentage'),
            # Per violation penalties
            (r'([0-9,]+(?:\.[0-9]+)?)\s+per\s+violation', 'per_violation'),
            # Up to penalties
            (r'up to \$([0-9,]+(?:\.[0-9]+)?)', 'monetary'),
        ]
        
        for pattern, penalty_type in patterns:
            for match in re.finditer(pattern, penalty_str, re.IGNORECASE):
                matched_value = match.group(1)
                try:
                    # Clean the value
                    cleaned_value = re.sub(r'[^\d.-]', '', matched_value)
                    value = float(cleaned_value)
                    
                    penalties.append({
                        'type': penalty_type,
                        'value': value,
                        'description': penalty_str[:100]  # First 100 chars
                    })
                except ValueError:
                    continue
        
        return penalties
    
    def _parse_timeline_field(self, timeline_str: str) -> Dict[str, Any]:
        """Parse compliance timeline strings."""
        if not timeline_str:
            return {'unit': 'days', 'value': 0}
        
        # Simple parsing for common patterns
        timeline_str = timeline_str.lower()
        
        # Check for numeric values
        numbers = re.findall(r'\d+', timeline_str)
        if numbers:
            value = int(numbers[0])
        else:
            value = 0
            
        # Determine time unit
        if 'day' in timeline_str:
            unit = 'days'
        elif 'week' in timeline_str:
            unit = 'weeks'
        elif 'month' in timeline_str:
            unit = 'months'
        else:
            unit = 'days'
            
        return {'unit': unit, 'value': value}
    
    def _standardize_values(self, record: Dict[str, Any]) -> Dict[str, Any]:
        """Standardize string values and types."""
        standardized = record.copy()
        
        # Standardize priority values to integers
        if 'complyflow_priority' in standardized:
            priority = standardized['complyflow_priority']
            if isinstance(priority, str):
                try:
                    # Convert priority strings to numbers
                    if priority.lower() in ['high', 'high-medium']:
                        standardized['complyflow_priority'] = 1
                    elif priority.lower() in ['medium', 'medium-high']:
                        standardized['complyflow_priority'] = 2
                    elif priority.lower() in ['low', 'low-medium']:
                        standardized['complyflow_priority'] = 3
                    elif priority.lower() == 'critical':
                        standardized['complyflow_priority'] = 0
                    else:
                        # Convert direct numbers or set default
                        standardized['complyflow_priority'] = int(priority) if priority.isdigit() else 4
                except:
                    standardized['complyflow_priority'] = 4  # Default priority
            
            # Ensure it's an integer
            if not isinstance(standardized['complyflow_priority'], int):
                standardized['complyflow_priority'] = 4
                
        # Standardize empty values
        for key, value in standardized.items():
            if value is None or (isinstance(value, str) and value.strip() == ''):
                standardized[key] = ''
                
        return standardized
    
    def validate_data_quality(self, transformed_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Validate the quality of transformed data.
        
        Returns:
            Dictionary with validation results
        """
        results = {
            'total_records': len(transformed_data),
            'valid_records': 0,
            'invalid_records': 0,
            'issues': []
        }
        
        for record in transformed_data:
            # Check if required fields exist and have valid values
            required_fields = ['regulation_name', 'region']
            is_valid = True
            
            for field in required_fields:
                if field not in record or not record[field]:
                    is_valid = False
                    results['issues'].append(f"Record missing required field: {field}")
                    break
                    
            if is_valid:
                results['valid_records'] += 1
            else:
                results['invalid_records'] += 1
        
        return results