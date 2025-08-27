#!/usr/bin/env python3
"""
Comprehensive Part-of-Speech Analysis Script

This script analyzes all JSON word files across three projects:
1. occasional-wotd
2. wordbun  
3. wordbug

It extracts all unique partOfSpeech values, counts frequencies,
collects example words, and identifies formatting variations.
"""

import json
import os
import sys
from collections import defaultdict, Counter
from pathlib import Path

def analyze_project(project_path, project_name):
    """Analyze all JSON files in a project directory."""
    pos_data = defaultdict(list)  # pos -> [(word, file)]
    pos_counts = Counter()
    
    if not os.path.exists(project_path):
        print(f"Warning: {project_path} does not exist")
        return pos_data, pos_counts
    
    json_files = list(Path(project_path).rglob("*.json"))
    print(f"\n{project_name}: Processing {len(json_files)} JSON files...")
    
    for json_file in json_files:
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                
            word = data.get('word', 'unknown')
            definitions = data.get('data', [])
            
            for definition in definitions:
                pos = definition.get('partOfSpeech')
                if pos:
                    # Clean up any whitespace
                    pos = pos.strip()
                    pos_data[pos].append((word, str(json_file)))
                    pos_counts[pos] += 1
                    
        except (json.JSONDecodeError, FileNotFoundError, KeyError) as e:
            print(f"Error processing {json_file}: {e}")
            continue
    
    return pos_data, pos_counts

def main():
    # Project paths
    projects = {
        'occasional-wotd': '/Users/kennedys1/Projects/occasional-wotd/data/demo/words',
        'wordbun': '/Users/kennedys1/Projects/wordbun/data/words', 
        'wordbug': '/Users/kennedys1/Projects/wordbug/data/words'
    }
    
    # Combined data across all projects
    all_pos_data = defaultdict(lambda: defaultdict(list))  # pos -> project -> [(word, file)]
    all_pos_counts = defaultdict(Counter)  # project -> Counter
    global_pos_counts = Counter()
    
    # Process each project
    for project_name, project_path in projects.items():
        pos_data, pos_counts = analyze_project(project_path, project_name)
        
        # Store project-specific data
        all_pos_counts[project_name] = pos_counts
        
        # Merge into global counts
        global_pos_counts.update(pos_counts)
        
        # Store examples per project
        for pos, examples in pos_data.items():
            all_pos_data[pos][project_name] = examples
    
    # Print comprehensive analysis
    print("\n" + "="*80)
    print("COMPREHENSIVE PART-OF-SPEECH ANALYSIS")
    print("="*80)
    
    print(f"\n1. COMPLETE LIST OF UNIQUE PARTS OF SPEECH ({len(global_pos_counts)} total):")
    print("-" * 60)
    for pos, count in global_pos_counts.most_common():
        print(f"{count:6d}  {pos}")
    
    print(f"\n2. PROJECT BREAKDOWN:")
    print("-" * 60)
    for project_name in projects.keys():
        counts = all_pos_counts[project_name]
        print(f"\n{project_name.upper()}:")
        print(f"  Total definitions: {sum(counts.values())}")
        print(f"  Unique POS types: {len(counts)}")
        print("  Distribution:")
        for pos, count in counts.most_common():
            print(f"    {count:4d}  {pos}")
    
    print(f"\n3. FORMATTING VARIATIONS AND SPECIAL CASES:")
    print("-" * 60)
    
    # Look for variations
    formatting_issues = []
    specialized_pos = []
    standard_pos = {'noun', 'verb', 'adjective', 'adverb', 'preposition', 'pronoun', 'conjunction', 'interjection'}
    
    for pos in sorted(global_pos_counts.keys()):
        # Check for punctuation/formatting issues
        if pos.endswith('.') or pos.endswith(',') or '  ' in pos:
            formatting_issues.append(pos)
        
        # Check for specialized grammatical categories
        if any(word in pos.lower() for word in ['transitive', 'intransitive', 'auxiliary', 'modal', 'phrasal', 'definite', 'indefinite']):
            specialized_pos.append(pos)
    
    if formatting_issues:
        print("\nFormatting inconsistencies:")
        for pos in formatting_issues:
            print(f"  - '{pos}' (appears {global_pos_counts[pos]} times)")
    
    if specialized_pos:
        print("\nSpecialized grammatical categories:")
        for pos in specialized_pos:
            print(f"  - '{pos}' (appears {global_pos_counts[pos]} times)")
    
    print(f"\n4. EXAMPLE WORDS BY PART OF SPEECH:")
    print("-" * 60)
    
    for pos in sorted(global_pos_counts.keys(), key=lambda x: global_pos_counts[x], reverse=True)[:20]:  # Top 20
        print(f"\n{pos.upper()} ({global_pos_counts[pos]} occurrences):")
        
        # Get up to 5 unique example words across all projects
        example_words = set()
        for project_name in projects.keys():
            if pos in all_pos_data and project_name in all_pos_data[pos]:
                for word, _ in all_pos_data[pos][project_name][:3]:
                    example_words.add(word)
                    if len(example_words) >= 5:
                        break
                if len(example_words) >= 5:
                    break
        
        print(f"  Examples: {', '.join(sorted(list(example_words)[:5]))}")
        
        # Show which projects contain this POS
        projects_with_pos = []
        for project_name in projects.keys():
            if pos in all_pos_counts[project_name]:
                count = all_pos_counts[project_name][pos]
                projects_with_pos.append(f"{project_name}({count})")
        print(f"  Projects: {', '.join(projects_with_pos)}")
    
    print(f"\n5. SUMMARY STATISTICS:")
    print("-" * 60)
    print(f"Total unique part-of-speech categories: {len(global_pos_counts)}")
    print(f"Total definitions processed: {sum(global_pos_counts.values())}")
    print(f"Most common POS: {global_pos_counts.most_common(1)[0][0]} ({global_pos_counts.most_common(1)[0][1]} occurrences)")
    print(f"Projects analyzed: {len(projects)}")
    
    # Cross-project comparison
    print(f"\n6. CROSS-PROJECT COMPARISON:")
    print("-" * 60)
    
    # Find POS that appear in all projects
    all_project_pos = set(all_pos_counts['occasional-wotd'].keys())
    for project_name in ['wordbun', 'wordbug']:
        all_project_pos &= set(all_pos_counts[project_name].keys())
    
    if all_project_pos:
        print(f"POS appearing in ALL projects ({len(all_project_pos)}):")
        for pos in sorted(all_project_pos):
            counts_str = ", ".join([f"{proj}:{all_pos_counts[proj][pos]}" for proj in projects.keys()])
            print(f"  - {pos} ({counts_str})")
    
    # Find unique POS per project
    for project_name in projects.keys():
        unique_pos = set(all_pos_counts[project_name].keys())
        for other_project in projects.keys():
            if other_project != project_name:
                unique_pos -= set(all_pos_counts[other_project].keys())
        
        if unique_pos:
            print(f"\nUnique to {project_name}:")
            for pos in sorted(unique_pos):
                print(f"  - {pos} ({all_pos_counts[project_name][pos]} occurrences)")

if __name__ == "__main__":
    main()