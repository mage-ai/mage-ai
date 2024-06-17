export interface ConnectionType {
  curveControl?: number; // Controls the curvature of the line (0 for straight, higher for more curved)
  from: string; // ID of the source node
  fromItem?: any; // Reference to the source node
  fromPosition?: 'top' | 'bottom' | 'left' | 'right' | 'middle'; // Position where the connection starts
  to: string; // ID of the destination node
  toItem?: any; // Reference to the destination node
  toPosition?: 'top' | 'bottom' | 'left' | 'right' | 'middle'; // Position where the connection ends
}
