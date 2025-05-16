import csv
import json
import os
csv_file_path = 'women_in_stem.csv'
json_file_path = '/public/output.json'

data = []

with open(csv_file_path, encoding='utf-8') as csv_file:
    csv_reader = csv.DictReader(csv_file)
    for row in csv_reader:
        data.append(row)

with open(json_file_path, 'w', encoding='utf-8') as json_file:
    json.dump(data, json_file, indent=4)

print("Current Working Directory:", os.getcwd())
