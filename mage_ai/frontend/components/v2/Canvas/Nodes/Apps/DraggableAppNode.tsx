import React, { useEffect, useRef } from 'react';
import styles from '@styles/scss/components/Canvas/Nodes/DraggableAppNode.module.scss';
import { DraggableWrapper, DraggableWrapperProps } from '../DraggableWrapper';
import { AppNodeType } from '../../interfaces';
import useAppEventsHandler, { CustomAppEvent } from '../../../Apps/PipelineCanvas/useAppEventsHandler';
import useDispatchMounted from '../useDispatchMounted';
import Text from '@mana/elements/Text';

type DraggableAppNodeProps = {
  node: AppNodeType;
};

const DraggableAppNode: React.FC<DraggableAppNodeProps> = ({
  node,
}: DraggableAppNodeProps) => {
  const nodeRef = useRef<HTMLDivElement>(null);

  useDispatchMounted(node, nodeRef);

  return (
    <DraggableWrapper
      className={styles.appNode}
      node={node}
      nodeRef={nodeRef}
    >
      <div>
        <Text>
          #

          1. Load
          1. Ingest: retrieve structured and unstructured data from multiple sources
          2. Map: map the data to a standardized data structure for processing in downstream steps
          2. Transform
          1. Cleaning
          2. [P2] Enrich: add additional information using 3rd party APIs, feature extraction, ML, etc.
          3. Chunking
          4. Tokenization
          5. Embed
          3. Export
          1. Vector database: store chunks, document metadata, and vector in vector database
          2. Knowledge graph: store chunks, document metadata, etc in knowledge graph
          4. Index
          1. [P2] [Contextual dictionar](https://www.notion.so/c797a9a07a1e45f4b24b589219607dd2?pvs=21)y: expand the original query with related terms from the dictionary to increase the likelihood of retrieving relevant documents
          2. [P2] [Document hierarchy](https://www.notion.so/c797a9a07a1e45f4b24b589219607dd2?pvs=21): create a more structured search through different levels of hierarchy by categorizing documents into various levels of granularity, such as sections, subsections, and paragraphs, making it easier to pinpoint specific information within a large corpus.
          3. [P1] Search index: create search index for vector space search during inference; e.g. FAISS
        </Text>
      </div>
    </DraggableWrapper>
  );
}

function areEqual(p1: DraggableAppNodeProps, p2: DraggableAppNodeProps) {
  const equal = p1?.node?.id === p2?.node?.id;
  return equal;
}

export default React.memo(DraggableAppNode, areEqual);
