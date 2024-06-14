self.onmessage = async function(event) {
  const { modulePath } = event.data;
  try {
    const module = await import(modulePath);
    self.postMessage({ success: true, module });
  } catch (error) {
    self.postMessage({ success: false, error: error.message });
  }
};
