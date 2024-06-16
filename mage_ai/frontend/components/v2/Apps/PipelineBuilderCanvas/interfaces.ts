import React from 'react';

export interface NodeType {
  children: React.ReactNode;
  id: number | string;
  left: number;
  title: string;
  top: number;
}

export interface ConnectionType {
  from: NodeType;
  to: NodeType;
}
