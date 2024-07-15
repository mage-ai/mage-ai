{% extends "data_exporters/default.jinja" %}
{% block imports %}
import psycopg2
from typing import List, Tuple, Union

{{ super() -}}
{% endblock %}

{% block content %}
@data_exporter
def pgvector(document_data: Tuple[str, str, str, List[str], List[Union[float, int]]], *args, **kwargs):
    """
    Exports document data to a Pgvector database.

    Args:
        document_data (Tuple[str, str, str, List[str], List[Union[float, int]]]):
            Tuple containing document_id, document_content, chunk_text, tokens, and embeddings.
    """
    document_id, chunk_text, _, _, embeddings = document_data
    connection_string = kwargs['connection_string']

    conn = psycopg2.connect(connection_string)
    cur = conn.cursor()

    # Enable pgvector extension
    cur.execute("CREATE EXTENSION IF NOT EXISTS vector")
    conn.commit()

    # Create table if not exists
    cur.execute("""
        CREATE TABLE IF NOT EXISTS documents (
            document_id TEXT PRIMARY KEY,
            -- document_content TEXT,
            chunk_text TEXT,
            -- tokens TEXT[],
            embeddings vector(768)  -- Assuming embedding size is 768, change if different
        )
    """)
    conn.commit()

    # Insert/Update the document
    cur.execute("""
        INSERT INTO documents (document_id, chunk_text, embeddings)
        VALUES (%s, %s, %s)
        ON CONFLICT (document_id) DO UPDATE
        SET chunk_text = EXCLUDED.chunk_text,
            embeddings = EXCLUDED.embeddings
    """, (document_id, chunk_text, embeddings))

    conn.commit()
    cur.close()
    conn.close()
{% endblock %}
