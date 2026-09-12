#!/usr/bin/env python3
"""
Script to validate all component JSON files
Usage: python scripts/validate_components.py
"""

import json
import sys
from pathlib import Path

def validate_json_file(file_path):
    """Validate a single JSON file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Basic validation
        required_fields = ['name', 'version', 'description']
        missing_fields = [field for field in required_fields if field not in data]
        
        if missing_fields:
            print(f"❌ {file_path}: Missing required fields: {', '.join(missing_fields)}")
            return False
        
        print(f"✅ {file_path}: Valid")
        return True
        
    except json.JSONDecodeError as e:
        print(f"❌ {file_path}: Invalid JSON - {e}")
        return False
    except Exception as e:
        print(f"❌ {file_path}: Error - {e}")
        return False

def validate_all_components():
    """Validate all component files"""
    templates_dir = Path(__file__).parent.parent / "templates"
    errors = 0
    total = 0
    
    for json_file in templates_dir.rglob("*.json"):
        total += 1
        if not validate_json_file(json_file):
            errors += 1
    
    print(f"\n📊 Validation Summary: {total - errors}/{total} files valid")
    
    if errors > 0:
        sys.exit(1)
    else:
        print("✅ All components are valid!")

if __name__ == "__main__":
    validate_all_components()

