#!/usr/bin/env python3
"""
Script to generate agent templates from prompts
Usage: python scripts/generate_agents.py --category dev --name new-agent
"""

import json
import argparse
import os
from pathlib import Path

def create_agent_template(category, name, description, prompt, **kwargs):
    """Create a new agent template"""
    template = {
        "name": name,
        "version": "1.0.0",
        "category": category,
        "description": description,
        "author": "Grok Agents Hub",
        "prompt": prompt,
        "examples": kwargs.get("examples", []),
        "config": {
            "temperature": kwargs.get("temperature", 0.7),
            "max_tokens": kwargs.get("max_tokens", 2000)
        },
        "tags": kwargs.get("tags", [category]),
        "usage": kwargs.get("usage", f"Use this agent for {description.lower()}")
    }
    
    return template

def save_agent(category, agent_data):
    """Save agent to appropriate directory"""
    templates_dir = Path(__file__).parent.parent / "templates" / "agents" / category
    templates_dir.mkdir(parents=True, exist_ok=True)
    
    file_path = templates_dir / f"{agent_data['name']}.json"
    
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(agent_data, f, indent=2, ensure_ascii=False)
    
    print(f"✅ Created agent: {file_path}")
    return file_path

def main():
    parser = argparse.ArgumentParser(description="Generate new agent templates")
    parser.add_argument("--category", required=True, help="Agent category (dev, productivity, creative, etc.)")
    parser.add_argument("--name", required=True, help="Agent name (will be used as filename)")
    parser.add_argument("--description", required=True, help="Agent description")
    parser.add_argument("--prompt", required=True, help="Agent prompt")
    parser.add_argument("--temperature", type=float, default=0.7, help="Temperature setting")
    parser.add_argument("--max-tokens", type=int, default=2000, help="Max tokens")
    parser.add_argument("--tags", nargs="+", help="Tags for the agent")
    
    args = parser.parse_args()
    
    agent_data = create_agent_template(
        category=args.category,
        name=args.name,
        description=args.description,
        prompt=args.prompt,
        temperature=args.temperature,
        max_tokens=args.max_tokens,
        tags=args.tags or [args.category]
    )
    
    save_agent(args.category, agent_data)

if __name__ == "__main__":
    main()

