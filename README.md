# Force viz

This tool helps you visualise heirarchical data like taxonomies.

## Supported filetypes

### JSON as per

Stackoverflow: Data represntation in json format [https://stackoverflow.com/questions/43625858/how-to-work-d3-with-json-format-instead-of-csv]

```text

{
  "nodes": [
    { "id": "1", "name": "Node A", "group": 1 },
    { "id": "2", "name": "Node B", "group": 2 }
  ],
  "links": [
    { "source": "1", "target": "2", "value": 10 }
  ]
}
`
````

### TSV

TSV and CSV files are supported.

Example taxonomies like IAB:
IAB Taxonomies [https://github.com/InteractiveAdvertisingBureau/Taxonomies/tree/main]

### TTL

Good TTL example is:

ITPC News topic schemas. I exctracted a bunch out a curiosity a while back:  [https://github.com/Arjuna1978/iptcVocabs/tree/main/iptc_vocabularies]

## lanuch here

[https://arjuna1978.github.io/forceViz/]
