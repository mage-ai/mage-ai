class CanvasManager {
  private static instance: CanvasManager;

  private constructor() {
    // Private constructor to prevent instantiation
  }

  public static getInstance(): CanvasManager {
    if (!CanvasManager.instance) {
      CanvasManager.instance = new CanvasManager();
    }
    return CanvasManager.instance;
  }

  // Add your methods and properties here
}
